// Lightweight helper to write a row to public.email_send_log via PostgREST.
// Never throws — failures are logged and swallowed so they can't break the caller.

export interface EmailLogEntry {
  template_name: string;
  recipient_email: string;
  message_id?: string | null;
  status: "sent" | "failed";
  error_message?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function logEmailSend(entry: EmailLogEntry): Promise<void> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;
    const res = await fetch(`${url}/rest/v1/email_send_log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        template_name: entry.template_name,
        recipient_email: entry.recipient_email,
        message_id: entry.message_id ?? null,
        status: entry.status,
        error_message: entry.error_message ?? null,
        metadata: entry.metadata ?? null,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error("[log-email] insert failed:", res.status, txt);
    } else {
      // consume body to avoid Deno resource leak
      await res.text();
    }
  } catch (err) {
    console.error("[log-email] unexpected error:", err);
  }
}
