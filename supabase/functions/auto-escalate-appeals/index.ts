import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildThreadHeaders,
  escapeHtml,
  formatCLP,
  persistThreadAnchor,
  renderTransactionalEmail,
  sendEmail,
} from "../_shared/email-templates/notification.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") || "https://trado.cl";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

serve(async (_req) => {
  console.log("[auto-escalate-appeals] Starting run");

  try {
    const now = new Date().toISOString();

    const { data: appeals, error } = await supabase
      .from("appeals")
      .select(`
        id,
        transaction_id,
        transaction:transactions!appeals_transaction_id_fkey(
          id, amount, product_name, seller_id, buyer_id,
          buyer:profiles!transactions_buyer_id_fkey(email, full_name),
          seller:profiles!transactions_seller_id_fkey(email, full_name)
        )
      `)
      .in("status", ["apelacion_abierta", "en_negociacion"])
      .lt("negotiation_deadline", now);

    if (error) throw error;

    if (!appeals || appeals.length === 0) {
      console.log("[auto-escalate-appeals] No expired appeals found");
      return new Response(JSON.stringify({ escalated: 0 }), { status: 200 });
    }

    console.log(`[auto-escalate-appeals] Found ${appeals.length} expired appeals`);
    let escalated = 0;

    for (const appeal of appeals) {
      try {
        // deno-lint-ignore no-explicit-any
        const tx = (Array.isArray(appeal.transaction) ? appeal.transaction[0] : appeal.transaction) as any;
        if (!tx) {
          console.error(`[auto-escalate-appeals] No transaction for appeal ${appeal.id}`);
          continue;
        }

        // 1. Update appeal — idempotency guard: only update if still in negotiation states
        const { error: updateError } = await supabase
          .from("appeals")
          .update({ status: "pendiente_intervencion_plataforma", escalated_at: now })
          .eq("id", appeal.id)
          .in("status", ["apelacion_abierta", "en_negociacion"]);

        if (updateError) {
          console.error(`[auto-escalate-appeals] Error updating appeal ${appeal.id}:`, updateError);
          continue;
        }

        // 2. Mirror status in transaction
        await supabase
          .from("transactions")
          .update({ appeal_status: "pendiente_intervencion_plataforma" })
          .eq("id", appeal.transaction_id);

        // 3. System message in chat (seller_id sender — rendered as "Trado" via [TRADO_SYSTEM] prefix)
        const systemMessage = `[TRADO_SYSTEM]⏱️ NOTIFICACIÓN DE TRADO

El plazo de negociación de 48 horas venció sin que las partes llegaran a un acuerdo.

📋 ¿Qué sucederá ahora?

• La apelación fue escalada automáticamente a un administrador de Trado
• Un administrador revisará toda la evidencia presentada por ambas partes
• La decisión será tomada de forma imparcial basándose en las pruebas disponibles

📎 Importante:

Por favor, suban toda la evidencia posible (fotos, capturas de pantalla, videos, documentos) en la sección de evidencia.

⏱️ El proceso de revisión puede tomar hasta 48 horas.`;

        await supabase.from("chat_messages").insert({
          transaction_id: appeal.transaction_id,
          user_id: tx.seller_id,
          message: systemMessage,
        });

        // 4. Push notifications (fire-and-forget)
        supabase.functions.invoke("send-push-notification", {
          body: {
            userIds: [tx.buyer_id, tx.seller_id].filter(Boolean),
            title: "Apelación escalada automáticamente",
            body: `⏱️ El plazo de negociación venció. Un administrador revisará el caso de "${tx.product_name}".`,
            url: `/transaction/${tx.id}`,
            tag: `auto-escalate-${appeal.id}`,
          },
        }).catch(() => {});

        // 5. Emails
        // deno-lint-ignore no-explicit-any
        const buyerProfile = (Array.isArray(tx.buyer) ? tx.buyer[0] : tx.buyer) as any;
        // deno-lint-ignore no-explicit-any
        const sellerProfile = (Array.isArray(tx.seller) ? tx.seller[0] : tx.seller) as any;
        const buyerName = escapeHtml(buyerProfile?.full_name || "Comprador");
        const sellerName = escapeHtml(sellerProfile?.full_name || "Vendedor");
        const productName = escapeHtml(tx.product_name);
        const refCode = (tx.id as string).substring(0, 8).toUpperCase();

        const thread = await buildThreadHeaders(supabase, tx.id, refCode);

        const buildHtml = (recipientName: string) =>
          renderTransactionalEmail({
            recipientName,
            headline: "Apelación escalada automáticamente",
            statusLine: "Plazo de negociación vencido",
            intro: `El plazo de 48 horas para negociar en la apelación por <strong>${productName}</strong> venció sin acuerdo. La apelación fue escalada automáticamente a un administrador de Trado.`,
            summaryTitle: "Caso en revisión",
            summaryRows: [
              { label: "Producto / servicio", value: productName },
              { label: "Monto en disputa", value: formatCLP(Number(tx.amount)), emphasis: true },
            ],
            nextStep:
              "Sube toda la evidencia que tengas (fotos, capturas, documentos). Un administrador revisará el caso y tomará una decisión imparcial en hasta 48 horas.",
            ctaText: "Ver caso y subir evidencia",
            ctaUrl: `${SITE_URL}/transaction/${tx.id}`,
            timelineActive: "in_delivery",
            timelineProblem: true,
            referenceCode: refCode,
            footerNote:
              "Mientras dure la revisión, los fondos permanecen en custodia de Trado.",
          });

        const subject = `${thread.subjectPrefix} Apelación escalada automáticamente · ${productName}`;

        const emailTasks: Promise<unknown>[] = [];
        if (buyerProfile?.email) {
          emailTasks.push(
            sendEmail({ to: buyerProfile.email, subject, html: buildHtml(buyerName), headers: thread.headers }),
          );
        }
        if (sellerProfile?.email) {
          emailTasks.push(
            sendEmail({ to: sellerProfile.email, subject, html: buildHtml(sellerName), headers: thread.headers }),
          );
        }

        // Admin notice
        const adminHtml = renderTransactionalEmail({
          recipientName: "equipo Trado",
          headline: "Apelación auto-escalada por vencimiento",
          statusLine: "Requiere arbitraje",
          summaryTitle: "Resumen del caso",
          summaryRows: [
            { label: "Referencia", value: `#${refCode}` },
            { label: "Producto", value: productName },
            { label: "Monto", value: formatCLP(Number(tx.amount)), emphasis: true },
            { label: "Comprador", value: `${buyerName} (${escapeHtml(buyerProfile?.email || "—")})` },
            { label: "Vendedor", value: `${sellerName} (${escapeHtml(sellerProfile?.email || "—")})` },
            { label: "Motivo de escalación", value: "Plazo de negociación de 48h vencido" },
          ],
          ctaText: "Revisar caso",
          ctaUrl: `${SITE_URL}/transaction/${tx.id}`,
        });
        emailTasks.push(
          sendEmail({
            to: "admin@trado.cl",
            subject: `[Admin] Apelación auto-escalada · #${refCode}`,
            html: adminHtml,
          }),
        );

        await Promise.allSettled(emailTasks);

        if (thread.isNewThread && thread.anchorId) {
          await persistThreadAnchor(supabase, tx.id, thread.anchorId);
        }

        escalated++;
        console.log(`[auto-escalate-appeals] Escalated appeal ${appeal.id}`);
      } catch (appealErr: unknown) {
        console.error(
          `[auto-escalate-appeals] Error on appeal ${appeal.id}:`,
          (appealErr as Error).message,
        );
      }
    }

    console.log(`[auto-escalate-appeals] Done. Escalated ${escalated}/${appeals.length}`);
    return new Response(JSON.stringify({ escalated }), { status: 200 });
  } catch (error: unknown) {
    console.error("[auto-escalate-appeals] Fatal:", (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
});
