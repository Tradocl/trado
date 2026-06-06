import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationResultRequest {
  profileId: string;
  userEmail: string;
  userName: string;
  status: "approved" | "rejected";
  rejectionReason?: string;
}

import { requireServiceRole } from "../_shared/auth.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authFail = await requireServiceRole(req);
  if (authFail) return new Response(authFail.body, { status: authFail.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { profileId, userEmail, userName, status, rejectionReason }: VerificationResultRequest = await req.json();

    console.log("Sending verification result notification:", { profileId, userEmail, userName, status });

    if (!profileId || !userEmail || !userName || !["approved", "rejected"].includes(status)) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("verification_status, verification_submitted_at, verification_result_email_key")
      .eq("id", profileId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (profile.verification_status !== status) {
      return new Response(JSON.stringify({ error: "Verification status mismatch" }), {
        status: 409,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const submissionKey = profile.verification_submitted_at || "no-submission-date";
    const emailKey = `${status}:${submissionKey}`;
    const { data: claimed, error: claimError } = await admin
      .from("profiles")
      .update({
        verification_result_email_key: emailKey,
        verification_result_email_status: status,
        verification_result_email_sent_at: new Date().toISOString(),
      })
      .eq("id", profileId)
      .neq("verification_result_email_key", emailKey)
      .select("id")
      .maybeSingle();

    if (claimError) throw claimError;
    if (!claimed) {
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const isApproved = status === "approved";
    const baseUrl = Deno.env.get("SITE_URL") || "https://trado.cl";
    
    const emailHtml = isApproved ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #22c55e;">
          ✅ ¡Verificación Aprobada!
        </h1>
        <p>Hola ${userName},</p>
        
        <div style="background-color: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
          <p style="margin: 0; font-size: 16px; color: #15803d;">
            <strong>¡Felicitaciones!</strong> Tu identidad ha sido verificada exitosamente en Trado.
          </p>
        </div>
        
        <p>Tu cuenta ahora tiene el sello de verificación, lo que aumentará tu reputación en la plataforma y generará más confianza con otros usuarios.</p>
        
        <p style="margin-top: 30px;">
          <a href="${baseUrl}/dashboard" 
             style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 5px; font-weight: bold;">
            Ir a Trado
          </a>
        </p>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Gracias por ser parte de Trado, la plataforma de compra y venta segura.
        </p>
        
        <p>Saludos,<br>Equipo Trado</p>
      </div>
    ` : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #ef4444;">
          ❌ Verificación No Aprobada
        </h1>
        <p>Hola ${userName},</p>
        
        <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <p style="margin: 0; font-size: 16px; color: #991b1b;">
            Lamentablemente, no pudimos verificar tu identidad con la documentación enviada en Trado.
          </p>
        </div>
        
        ${rejectionReason ? `
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0 0 5px 0; font-weight: bold; color: #92400e;">Motivo del rechazo:</p>
            <p style="margin: 0; color: #78350f; white-space: pre-wrap;">${rejectionReason}</p>
          </div>
        ` : `
          <p><strong>Posibles motivos:</strong></p>
          <ul style="color: #6b7280;">
            <li>La imagen del documento no es clara o legible</li>
            <li>La selfie con el carnet no muestra tu rostro o el documento con claridad</li>
            <li>Los datos del documento no coinciden con tu información registrada</li>
            <li>El documento no es válido o está vencido</li>
          </ul>
        `}
        
        <p><strong>¿Qué puedes hacer?</strong></p>
        <p>Puedes intentar nuevamente subiendo imágenes más claras donde se vean todos los datos de tu cédula y tu rostro de forma nítida.</p>
        
        <p style="margin-top: 30px;">
          <a href="${baseUrl}/verification" 
             style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 5px; font-weight: bold;">
            Intentar Nuevamente
          </a>
        </p>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Si tienes dudas, contáctanos respondiendo a este email.
        </p>
        
        <p>Saludos,<br>Equipo Trado</p>
      </div>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Trado Notificaciones <notificaciones@trado.cl>",
        to: [userEmail],
        subject: isApproved 
          ? "✅ ¡Tu verificación ha sido aprobada!" 
          : "❌ Verificación no aprobada - Inténtalo nuevamente",
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      await admin
        .from("profiles")
        .update({
          verification_result_email_key: profile.verification_result_email_key,
          verification_result_email_status: null,
          verification_result_email_sent_at: null,
        })
        .eq("id", profileId)
        .eq("verification_result_email_key", emailKey);
      throw new Error(`Resend API error: ${error}`);
    }

    const data = await response.json();
    console.log("Verification result email sent successfully:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-verification-result function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
