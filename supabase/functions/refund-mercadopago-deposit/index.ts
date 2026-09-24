import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { alertarCritico } from "../_shared/alertas.ts";
import { adminMfaRequired, tokenAal } from "../_shared/auth.ts";
import {
  escapeHtml,
  formatCLP,
  renderTransactionalEmail,
  sendEmail,
  SITE_URL,
} from "../_shared/email-templates/notification.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    // AuthN: lo puede pedir el dueño de la billetera (sólo sobre su plata de
    // tarjeta) o un admin con segundo factor. La plata vuelve siempre a la misma
    // tarjeta con la que se pagó, así que dejar que el usuario lo gatille no abre
    // un camino para sacar plata a otro lado: es justamente el camino seguro.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const callerId = userData.user.id;

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });

    const body = await req.json().catch(() => ({}));
    const movementId = body?.movement_id as string | undefined;
    if (!movementId) return json({ error: "movement_id required" }, 400);

    // Load movement
    const { data: mov, error: movErr } = await supabase
      .from("wallet_movements")
      .select("id, wallet_id, type, amount, status, description, external_session_id, refunded_at")
      .eq("id", movementId)
      .maybeSingle();

    if (movErr || !mov) return json({ error: "Movement not found" }, 404);
    if (mov.type !== "deposit") return json({ error: "Movement is not a deposit" }, 400);
    if (mov.status !== "approved") return json({ error: "Only approved deposits can be refunded" }, 400);
    if (mov.refunded_at) return json({ error: "Deposit already refunded" }, 400);

    const sessionId = mov.external_session_id ?? "";
    const paymentId = sessionId.startsWith("mp_") ? sessionId.slice(3) : null;
    if (!paymentId) return json({ error: "Not a Mercado Pago deposit" }, 400);

    // Load wallet to ensure sufficient balance
    const { data: wallet, error: wErr } = await supabase
      .from("wallets")
      .select("id, balance, user_id, gateway_funded_balance")
      .eq("id", mov.wallet_id)
      .single();
    if (wErr || !wallet) return json({ error: "Wallet not found" }, 404);

    const esDueno = wallet.user_id === callerId;
    if (!esDueno && !isAdmin) return json({ error: "Forbidden" }, 403);
    // Un admin reembolsando plata ajena necesita segundo factor.
    if (!esDueno && tokenAal(token) !== "aal2") return adminMfaRequired(corsHeaders);

    // Un retiro pendiente reserva ese saldo aunque todavía no lo descuente.
    // Sin esta guarda se podía reembolsar el depósito Y aprobar el retiro
    // después, pagando dos veces el mismo dinero.
    const { data: retirosPendientes } = await supabase
      .from("wallet_movements")
      .select("id, amount")
      .eq("wallet_id", mov.wallet_id)
      .eq("type", "withdrawal")
      .eq("status", "pending");
    const reservado = (retirosPendientes ?? []).reduce(
      (acc, r) => acc + Math.abs(Number(r.amount)),
      0,
    );

    // Se devuelve lo que quede de ese depósito, no necesariamente el total: si
    // parte ya se gastó en una sala completada, esa parte es del vendedor.
    // El usuario sólo puede devolver plata que todavía tiene marca de tarjeta.
    const libre = Math.max(0, Number(wallet.balance) - reservado);
    let amount = Math.min(Number(mov.amount), libre);
    if (esDueno && !isAdmin) {
      amount = Math.min(amount, Number(wallet.gateway_funded_balance ?? 0));
    }
    amount = Math.floor(amount);

    if (amount <= 0) {
      return json({
        error: reservado > 0
          ? "Hay un retiro pendiente sobre este saldo. Cancélalo primero para poder reembolsar."
          : "No queda saldo de este depósito por devolver.",
        pendingWithdrawals: retirosPendientes?.length ?? 0,
        reservado,
      }, 409);
    }

    // RESERVA PREVIA. El movimiento se registra como 'pending' ANTES de llamar a
    // Mercado Pago, y recién se confirma cuando la devolución se concreta.
    //
    // Al revés —que era como estaba— la plata salía de Mercado Pago y si el
    // registro fallaba después, el dinero se iba de verdad y los libros no se
    // enteraban. Pasó el 2026-09-13: se devolvieron $200.000 y la billetera
    // siguió mostrando $200.000, a un clic de pagarle dos veces a la usuaria.
    //
    // Con la reserva, un fallo de base de datos ocurre antes de mover plata, y
    // si Mercado Pago rechaza sólo queda un movimiento pending que se borra.
    //
    // El saldo se descuenta ACÁ, de forma atómica (credit_wallet_balance falla si
    // quedaría negativo). Antes se leía y se escribía en dos pasos: dos reembolsos
    // simultáneos veían el mismo saldo y podían devolver más de lo que había.
    const { data: saldoTrasDescuento, error: descuentoErr } = await supabase.rpc(
      "credit_wallet_balance",
      { p_wallet_id: mov.wallet_id, p_delta: -amount },
    );
    if (descuentoErr || saldoTrasDescuento === null || saldoTrasDescuento === undefined) {
      console.error("[refund-mercadopago-deposit] No se pudo reservar el saldo:", descuentoErr);
      return json({ error: "Saldo insuficiente para reembolsar" }, 409);
    }
    const newBalance = Number(saldoTrasDescuento);
    const devolverSaldo = async () => {
      await supabase.rpc("credit_wallet_balance", { p_wallet_id: mov.wallet_id, p_delta: amount });
    };

    const { data: reserva, error: reservaErr } = await supabase
      .from("wallet_movements")
      .insert({
        wallet_id: mov.wallet_id,
        type: "refund",
        amount: -amount,
        balance_after: newBalance,
        description: `Reembolso Mercado Pago [${paymentId}]`,
        status: "pending",
        external_session_id: `mp_refund_${paymentId}`,
      })
      .select("id")
      .maybeSingle();

    if (reservaErr || !reserva) {
      console.error("[refund-mercadopago-deposit] No se pudo reservar el movimiento:", reservaErr);
      // Nada salió de Mercado Pago todavía: se devuelve el saldo y se aborta.
      await devolverSaldo();
      return json({
        error: "No se pudo registrar el reembolso, no se devolvió nada. " +
          (reservaErr?.message ?? ""),
      }, 500);
    }

    /** Borra la reserva y devuelve el saldo cuando la devolución no se concretó. */
    const soltarReserva = async () => {
      await supabase.from("wallet_movements").delete().eq("id", reserva.id);
      await devolverSaldo();
    };

    // Call Mercado Pago refunds API
    const mpResp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `refund_${movementId}`,
      },
      body: JSON.stringify({ amount }),
    });

    const mpBody = await mpResp.json().catch(() => ({}));
    if (!mpResp.ok) {
      console.error("[refund-mercadopago-deposit] MP refund failed:", mpResp.status, mpBody);
      // El motivo de Mercado Pago viaja al panel: sin esto el admin sólo ve
      // "non-2xx" y no tiene cómo saber si es saldo insuficiente, un pago
      // demasiado antiguo o un medio que no admite devolución.
      const motivo = mpBody?.message
        ?? mpBody?.error
        ?? (Array.isArray(mpBody?.cause) ? mpBody.cause[0]?.description : null)
        ?? `HTTP ${mpResp.status}`;
      await soltarReserva();
      return json({
        error: `Mercado Pago rechazó el reembolso: ${motivo}`,
        mp: mpBody,
        mp_status: mpResp.status,
      }, 502);
    }

    // La devolución se concretó: la reserva pasa a aprobada.
    const { error: confirmErr } = await supabase
      .from("wallet_movements")
      .update({ status: "approved" })
      .eq("id", reserva.id);

    if (confirmErr) {
      // La plata YA salió de Mercado Pago. No se aborta ni se borra nada: el
      // movimiento queda pending y visible, que es infinitamente mejor que
      // perder el rastro. Queda en el log para cuadrarlo a mano.
      await alertarCritico({
        resumen: "Reembolso enviado pero el movimiento quedó en pending",
        accion:
          `Mercado Pago YA devolvió ${amount}. El saldo ya está descontado, pero el ` +
          `movimiento ${reserva.id} quedó en pending. Márcalo como approved para que ` +
          "los libros cuadren.",
        contexto: {
          movimiento: reserva.id,
          billetera: mov.wallet_id,
          monto: amount,
          pago_mercadopago: paymentId,
        },
        error: confirmErr,
      });
    }
    const refundMov = reserva;

    // El saldo ya se descontó al reservar. Falta bajar la marca de tarjeta: antes
    // no se hacía y quedaban billeteras con saldo $0 y "plata de tarjeta" > 0.
    const { error: markConsumeErr } = await supabase.rpc("consume_gateway_funded", {
      p_wallet_id: mov.wallet_id,
      p_amount: amount,
    });
    if (markConsumeErr) {
      console.error("[refund-mercadopago-deposit] consume_gateway_funded falló (no bloqueante):", markConsumeErr);
    }

    const { error: markErr } = await supabase
      .from("wallet_movements")
      .update({ refunded_at: new Date().toISOString() })
      .eq("id", movementId);

    if (markErr) {
      console.error("[refund-mercadopago-deposit] Mark refunded_at failed:", markErr);
    }

    // Avisarle al usuario. Sin esto ve su saldo caer a cero sin explicación
    // alguna, que después de una disputa se lee como que le desapareció la
    // plata. Va al final y envuelto: el reembolso ya se hizo y es lo que importa.
    try {
      const { data: perfil } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", wallet.user_id)
        .maybeSingle();

      if (perfil?.email) {
        const nombre = (perfil.full_name || "").trim().split(/\s+/)[0] || "Hola";
        await sendEmail({
          to: perfil.email,
          subject: `Te devolvimos ${formatCLP(amount)} · Trado`,
          html: renderTransactionalEmail({
            recipientName: escapeHtml(nombre),
            headline: "Te devolvimos tu dinero",
            eyebrow: "Reembolso procesado",
            statusLine: "De vuelta a tu medio de pago original",
            tone: "success",
            intro:
              `procesamos la devolución de <strong>${formatCLP(amount)}</strong>. ` +
              "El dinero vuelve al mismo medio con el que pagaste, no a tu billetera Trado.",
            summaryTitle: "Detalle",
            summaryRows: [
              { label: "Monto devuelto", value: formatCLP(amount), emphasis: true },
              { label: "Vuelve a", value: "El medio de pago que usaste" },
              { label: "Saldo en tu billetera Trado", value: formatCLP(newBalance) },
            ],
            nextStep:
              "Según tu banco puede tardar algunos días hábiles en aparecer. " +
              "Por eso vas a ver tu saldo en Trado bajar antes de que el dinero " +
              "llegue: no es un error, está en camino de vuelta a ti.",
            ctaText: "Ver mis movimientos",
            ctaUrl: `${SITE_URL()}/movements`,
            footerNote:
              "Si en una semana no lo ves reflejado, escríbenos a contacto@trado.cl.",
          }),
        });
      }
    } catch (mailErr) {
      console.error("[refund-mercadopago-deposit] aviso al usuario falló (no bloqueante):", mailErr);
    }

    return json({
      success: true,
      refund_id: mpBody?.id,
      refund_movement_id: refundMov?.id,
      new_balance: newBalance,
    });
  } catch (err: any) {
    console.error("[refund-mercadopago-deposit] Unexpected:", err);
    return json({ error: err?.message ?? "Unexpected error" }, 500);
  }
});
