import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "npm:ai@5.0.0";
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible@1.0.0";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Eres el asistente de soporte de Trado, una plataforma chilena de pagos P2P con escrow (custodia).

# Cómo funciona Trado
- Comprador y vendedor crean una "sala" de transacción.
- El comprador deposita el dinero (vía Mercado Pago, transferencia o saldo de wallet) y queda en custodia (blocked_balance).
- Trado retiene el dinero hasta que el producto/servicio se entregue correctamente.
- Cuando el comprador confirma recepción, se libera el pago al vendedor menos la comisión.
- Comisión: 5% (mínimo $1.000 CLP, máximo $20.000 CLP), redondeada a la decena.
- Tipos de venta: Servicio, Producto en persona, Producto con envío.

# Wallet
- balance = disponible para retirar
- blocked_balance = en custodia (escrow), no se puede retirar
- Retiros son SIEMPRE manuales: el usuario solicita y un admin transfiere a su cuenta bancaria.
- El RUT de la cuenta bancaria DEBE coincidir con el RUT del perfil.

# Verificación de identidad
- Opcional, pero usuarios no verificados tienen límite de $100.000 CLP por transacción y $200.000 acumulado.
- Para verificar: subir cédula + selfie en /verification. Un admin revisa.

# Apelaciones
- Si hay conflicto, cualquier parte puede abrir una apelación.
- Hay 48h de negociación entre las partes; si no hay acuerdo, escala a un admin.
- La comisión NUNCA se devuelve, incluso en apelaciones o acuerdos mutuos.

# Devoluciones (productos con envío)
- El comprador puede solicitar devolución antes de confirmar recepción.
- Se clasifica responsabilidad (vendedor o comprador) para determinar quién paga el envío de vuelta.

# Reglas importantes
- Amounts en CLP sin decimales.
- Login: email + contraseña, o Google.
- Email: transacciones@trado.cl (transaccional), contacto@trado.cl (soporte).

# Tu rol
- Responde claro y conciso, en español chileno neutral, máximo 4-5 frases salvo que requiera más detalle.
- Si el usuario tiene un problema técnico complejo, un reclamo, o necesita acción manual de un admin (ej: revisar un retiro, revertir un movimiento, problema con verificación, error de un edge case), USA la herramienta "escalateToHuman" para abrir un ticket por email a contacto@trado.cl.
- Antes de escalar, intenta resolver con la info de arriba o pide al usuario detalles relevantes (ID de transacción, monto, fecha).
- Nunca inventes información que no esté arriba; si no sabes, dilo y ofrece escalar.
- NO pidas al usuario datos sensibles como contraseñas ni claves bancarias completas.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const user = userData.user;

    const body = await req.json() as { messages: UIMessage[]; threadId: string };
    const { messages, threadId } = body;

    if (!threadId || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Datos inválidos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify thread ownership
    const { data: thread, error: thErr } = await supabase
      .from("support_threads")
      .select("id,user_id,title")
      .eq("id", threadId)
      .maybeSingle();
    if (thErr || !thread || thread.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Hilo no encontrado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Persist last user message
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
    if (lastUserMsg) {
      await supabase.from("support_messages").insert({
        thread_id: threadId,
        role: "user",
        parts: lastUserMsg.parts as any,
      });

      // Auto-title from first user message
      if (thread.title === "Nueva conversación") {
        const text = (lastUserMsg.parts as any[]).find(p => p.type === "text")?.text ?? "";
        const title = text.slice(0, 60).trim() || "Nueva conversación";
        await supabase.from("support_threads").update({ title }).eq("id", threadId);
      }
    }

    const profile = await supabase.from("profiles").select("full_name,email").eq("id", user.id).maybeSingle();
    const userName = profile.data?.full_name ?? "Usuario";
    const userEmail = profile.data?.email ?? user.email ?? "";

    const gateway = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: {
        "Lovable-API-Key": Deno.env.get("LOVABLE_API_KEY")!,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
    });
    const model = gateway("google/gemini-3-flash-preview");

    const tools = {
      escalateToHuman: tool({
        description: "Escala el problema del usuario a un humano de soporte enviando un email a contacto@trado.cl. Úsalo cuando el problema no se puede resolver con la FAQ o requiere acción manual de un admin.",
        inputSchema: z.object({
          summary: z.string().describe("Resumen breve del problema (1-2 frases)"),
          details: z.string().describe("Detalles relevantes: lo que intentó el usuario, IDs de transacción, montos, fechas si aplica"),
          urgency: z.enum(["low", "medium", "high"]).describe("Urgencia: high para problemas con dinero o acceso, medium para errores funcionales, low para dudas generales"),
        }),
        execute: async ({ summary, details, urgency }) => {
          const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
          if (!RESEND_KEY) {
            return { ok: false, message: "Email de soporte no configurado" };
          }
          const html = `<h2>Nuevo ticket de soporte (${urgency.toUpperCase()})</h2>
            <p><b>Usuario:</b> ${userName} (${userEmail})</p>
            <p><b>User ID:</b> ${user.id}</p>
            <p><b>Thread ID:</b> ${threadId}</p>
            <p><b>Resumen:</b> ${summary}</p>
            <p><b>Detalles:</b></p>
            <pre style="white-space:pre-wrap;font-family:inherit">${details}</pre>
            <hr/>
            <p style="color:#888;font-size:12px">Enviado desde el chat de soporte de Trado</p>`;
          try {
            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { "Authorization": `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                from: "Trado Soporte <contacto@trado.cl>",
                to: ["contacto@trado.cl"],
                reply_to: userEmail || undefined,
                subject: `[Soporte ${urgency}] ${summary.slice(0, 80)}`,
                html,
              }),
            });
            if (!res.ok) {
              const txt = await res.text();
              return { ok: false, message: `Error al enviar: ${txt.slice(0, 120)}` };
            }
            await supabase.from("support_threads").update({ status: "escalated", escalated_at: new Date().toISOString() }).eq("id", threadId);
            return { ok: true, message: "Ticket enviado al equipo de soporte. Te responderán por email pronto." };
          } catch (e) {
            return { ok: false, message: `Error al escalar: ${(e as Error).message}` };
          }
        },
      }),
    };

    const result = streamText({
      model,
      system: SYSTEM_PROMPT + `\n\n# Contexto del usuario\nNombre: ${userName}\nEmail: ${userEmail}`,
      messages: convertToModelMessages(messages),
      tools,
      stopWhen: stepCountIs(50),
    });

    return result.toUIMessageStreamResponse({
      headers: corsHeaders,
      originalMessages: messages,
      onFinish: async ({ messages: finalMessages }) => {
        const last = finalMessages[finalMessages.length - 1];
        if (last && last.role === "assistant") {
          await supabase.from("support_messages").insert({
            thread_id: threadId,
            role: "assistant",
            parts: last.parts as any,
          });
        }
      },
    });
  } catch (e) {
    console.error("support-chat error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
