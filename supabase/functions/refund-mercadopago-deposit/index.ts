import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
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
    // AuthN: caller must be authenticated and admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

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

    const amount = Number(mov.amount);

    // Load wallet to ensure sufficient balance
    const { data: wallet, error: wErr } = await supabase
      .from("wallets")
      .select("id, balance, user_id")
      .eq("id", mov.wallet_id)
      .single();
    if (wErr || !wallet) return json({ error: "Wallet not found" }, 404);

    if (Number(wallet.balance) < amount) {
      return json({ error: "Saldo insuficiente para reembolsar" }, 400);
    }

    // Un retiro pendiente reserva ese saldo aunque todavía no lo descuente.
    // Sin esta guarda se podía reembolsar el depósito Y aprobar el retiro
    // después, pagando dos veces el mismo dinero.
    const { data: retirosPendientes } = await supabase
      .from("wallet_movements")
      .select("id, amount")
      .eq("wallet_id", mov.wallet_id)
      .eq("type", "withdrawal")
      .eq("status", "pending");

    if (retirosPendientes && retirosPendientes.length > 0) {
      const reservado = retirosPendientes.reduce(
        (acc, r) => acc + Math.abs(Number(r.amount)),
        0,
      );
      if (Number(wallet.balance) - reservado < amount) {
        return json({
          error:
            "El usuario tiene un retiro pendiente sobre este saldo. " +
            "Rechaza primero el retiro para poder reembolsar el depósito, " +
            "o le estarías pagando dos veces.",
          pendingWithdrawals: retirosPendientes.length,
          reservado,
        }, 409);
      }
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
    const newBalance = Number(wallet.balance) - amount;

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
      // Nada salió de Mercado Pago todavía: se aborta sin consecuencias.
      return json({
        error: "No se pudo registrar el reembolso, no se devolvió nada. " +
          (reservaErr?.message ?? ""),
      }, 500);
    }

    /** Borra la reserva cuando la devolución no llegó a concretarse. */
    const soltarReserva = async () => {
      await supabase.from("wallet_movements").delete().eq("id", reserva.id);
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
      console.error(
        "[refund-mercadopago-deposit] CRITICO: Mercado Pago devolvió pero no se " +
        `pudo confirmar el movimiento ${reserva.id}. Cuadrar a mano.`,
        confirmErr,
      );
    }
    const refundMov = reserva;

    const { error: updWalletErr } = await supabase
      .from("wallets")
      .update({ balance: newBalance })
      .eq("id", mov.wallet_id);

    if (updWalletErr) {
      // Mercado Pago YA devolvió la plata. Antes acá se borraba el movimiento,
      // que es justo el error que causó el descuadre del 2026-09-13: se pierde
      // el rastro de dinero que sí salió. El movimiento se conserva; lo único
      // que queda desalineado es el saldo, y eso se ve y se corrige.
      console.error(
        "[refund-mercadopago-deposit] CRITICO: Mercado Pago devolvió pero no se " +
        `pudo descontar el saldo de la billetera ${mov.wallet_id}. ` +
        `El movimiento ${refundMov.id} queda registrado. Cuadrar el saldo a mano.`,
        updWalletErr,
      );
      return json({
        error: "El reembolso se envió a Mercado Pago pero no se pudo actualizar " +
          "el saldo. El movimiento quedó registrado; revisa la billetera.",
        refund_movement_id: refundMov.id,
      }, 500);
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
