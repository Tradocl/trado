// Cuadratura Mercado Pago ↔ Trado.
//
// Compara los pagos que MP dice haber cobrado con lo que Trado registró, y:
//   - acredita todo pago de Trado aprobado que no esté en ninguna billetera
//     (el aviso del webhook se perdió o falló: lo que pasó el 2026-10-02);
//   - marca las diferencias que no puede arreglar sola (reembolsos hechos en MP
//     que Trado no registró, montos que no calzan) y avisa por correo.
//
// La corre pg_cron cada 30 minutos y el panel de admin a pedido (GET o POST,
// con ?dias=N). Devuelve el informe completo en JSON.
//
// No debita nunca: si MP devolvió plata que Trado no registró, sólo avisa,
// porque descontar saldo sin una persona mirando puede dejar a alguien en
// negativo o pisar una sala en curso.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireServiceRole } from "../_shared/auth.ts";
import { alertarCritico } from "../_shared/alertas.ts";
import { acreditarPagoMP, comisionMP, referenciaTrado, type PagoMP } from "../_shared/mp-deposit.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function pagosMP(dias: number): Promise<PagoMP[]> {
  const out: PagoMP[] = [];
  for (let offset = 0; offset < 2000; offset += 100) {
    const url = new URL("https://api.mercadopago.com/v1/payments/search");
    url.searchParams.set("sort", "date_created");
    url.searchParams.set("criteria", "desc");
    url.searchParams.set("range", "date_created");
    url.searchParams.set("begin_date", `NOW-${dias}DAYS`);
    url.searchParams.set("end_date", "NOW");
    url.searchParams.set("limit", "100");
    url.searchParams.set("offset", String(offset));
    const r = await fetch(url, { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` } });
    if (!r.ok) throw new Error(`MP payments/search ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const body = await r.json();
    out.push(...(body.results ?? []));
    if (out.length >= (body.paging?.total ?? 0) || (body.results ?? []).length < 100) break;
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const authFail = await requireServiceRole(req);
  if (authFail) return authFail;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const url = new URL(req.url);
  const dias = Math.min(180, Math.max(1, Number(url.searchParams.get("dias") ?? 60)));

  try {
    const pagos = await pagosMP(dias);

    const { data: movs, error: movErr } = await supabase
      .from("wallet_movements")
      .select("wallet_id, type, amount, status, external_session_id, created_at")
      .like("external_session_id", "mp_%");
    if (movErr) throw movErr;
    const deposito = new Map<string, { amount: number; status: string }>();
    const reembolsado = new Map<string, number>();
    for (const m of movs ?? []) {
      const id = String(m.external_session_id);
      if (id.startsWith("mp_refund_")) {
        if (m.status === "approved") {
          const k = id.slice("mp_refund_".length);
          reembolsado.set(k, (reembolsado.get(k) ?? 0) + Math.abs(Number(m.amount)));
        }
      } else {
        deposito.set(id.slice("mp_".length), { amount: Number(m.amount), status: m.status });
      }
    }

    const acreditadosAhora: unknown[] = [];
    const diferencias: { pago: string; tipo: string; detalle: string }[] = [];
    const ajenos: unknown[] = [];
    const tot = { aprobados_trado: 0, bruto: 0, comision_mp: 0, reembolsado_mp: 0, reembolsado_trado: 0, otros_estados: 0 };

    for (const p of pagos) {
      const id = String(p.id);
      const ref = referenciaTrado(p);
      const refundedMP = Number(p.transaction_amount_refunded ?? 0);

      if (!ref) {
        if (p.status === "approved" || p.status === "refunded") {
          ajenos.push({ pago: id, estado: p.status, monto: p.transaction_amount, fecha: p.date_created, descripcion: p.description ?? null });
        }
        continue;
      }
      if (p.status !== "approved" && p.status !== "refunded") {
        tot.otros_estados++;
        continue;
      }

      tot.aprobados_trado++;
      tot.bruto += Number(p.transaction_amount);
      tot.comision_mp += comisionMP(p);
      tot.reembolsado_mp += refundedMP;
      tot.reembolsado_trado += reembolsado.get(id) ?? 0;

      const dep = deposito.get(id);
      if (!dep) {
        if (p.status === "approved") {
          const r = await acreditarPagoMP(supabase, p, "reconcile-mercadopago");
          if (r.estado === "acreditado") {
            acreditadosAhora.push({ pago: id, monto: r.monto, wallet: ref.wallet_id });
          } else if (r.estado !== "ya_estaba") {
            diferencias.push({ pago: id, tipo: "no_acreditado", detalle: r.estado === "error" ? r.motivo : r.estado });
          }
        } else {
          // Cobrado y devuelto entero en MP, nunca acreditado: cuadra en cero.
        }
      } else if (Math.abs(dep.amount - Number(p.transaction_amount)) > 0.5) {
        diferencias.push({ pago: id, tipo: "monto_distinto", detalle: `MP ${p.transaction_amount} vs Trado ${dep.amount}` });
      }

      const refTrado = reembolsado.get(id) ?? 0;
      if (dep && Math.abs(refundedMP - refTrado) > 0.5) {
        diferencias.push({
          pago: id,
          tipo: refundedMP > refTrado ? "reembolso_no_registrado" : "reembolso_de_mas",
          detalle: `MP devolvió ${refundedMP}, Trado registró ${refTrado}`,
        });
      }
    }

    // Lo que Trado le debe hoy a sus usuarios (saldo libre + plata retenida en salas).
    const { data: wallets } = await supabase.from("wallets").select("balance, blocked_balance, gateway_funded_balance");
    const pasivo = (wallets ?? []).reduce(
      (a: any, w: any) => ({
        saldo: a.saldo + Number(w.balance),
        retenido: a.retenido + Number(w.blocked_balance),
        marca_tarjeta: a.marca_tarjeta + Number(w.gateway_funded_balance),
      }),
      { saldo: 0, retenido: 0, marca_tarjeta: 0 },
    );

    const informe = {
      generado: new Date().toISOString(),
      dias,
      mercado_pago: {
        pagos_revisados: pagos.length,
        ...tot,
        neto_recibido: Math.round((tot.bruto - tot.comision_mp) * 100) / 100,
        ajenos_a_trado: ajenos,
      },
      trado: { pasivo_usuarios: pasivo },
      acreditados_ahora: acreditadosAhora,
      diferencias,
      cuadra: diferencias.length === 0,
    };

    if (acreditadosAhora.length > 0) {
      await alertarCritico({
        resumen: `Cuadratura MP: ${acreditadosAhora.length} pago(s) acreditados que el webhook no había registrado`,
        accion: "Ya quedaron acreditados. Revisar por qué el webhook no los procesó (logs de mercadopago-webhook).",
        contexto: { pagos: JSON.stringify(acreditadosAhora) },
      });
    }
    // Diferencias que persisten: un resumen al día (12:00 UTC), no cada 30 min.
    const ahora = new Date();
    if (diferencias.length > 0 && ahora.getUTCHours() === 12 && ahora.getUTCMinutes() < 30) {
      await alertarCritico({
        resumen: `Cuadratura MP: ${diferencias.length} diferencia(s) sin resolver`,
        accion: "Revisar en el panel de admin → Cuadratura Mercado Pago. No se corrigen solas.",
        contexto: { diferencias: JSON.stringify(diferencias) },
      });
    }

    console.log(`[reconcile-mercadopago] ${pagos.length} pagos, ${acreditadosAhora.length} acreditados ahora, ${diferencias.length} diferencias`);
    return json(informe);
  } catch (e: any) {
    console.error("[reconcile-mercadopago] Error:", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
