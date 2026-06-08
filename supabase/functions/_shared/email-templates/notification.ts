// Shared minimal Trado email template + threading helper.
// Used by all notification edge functions to keep a single visual style and
// avoid sending one disconnected email per action (Gmail/Apple Mail group by
// References + stable subject prefix).

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

export const TRADO = {
  primary: "#2230C2",
  primaryDark: "#1B26A0",
  primaryGlow: "#5A66F0",
  accent: "#FF6B4A",
  accentSoft: "#FFE6DE",
  text: "#0F1424",
  muted: "#5B6378",
  border: "#E5E7F0",
  bg: "#F5F6FB",
  card: "#FFFFFF",
  success: "#10B981",
  successSoft: "#D1FADF",
  warning: "#F59E0B",
  warningSoft: "#FEF0C7",
  danger: "#EF4444",
  dangerSoft: "#FEE4E2",
  info: "#2230C2",
  infoSoft: "#E0E4FF",
  font:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
};

export type EmailTone = "info" | "success" | "warning" | "danger" | "celebrate";

interface ToneTheme {
  gradient: string;
  accentGradient: string;
  badgeBg: string;
  badgeText: string;
  icon: string;
}

const TONE_THEMES: Record<EmailTone, ToneTheme> = {
  info: {
    gradient: "linear-gradient(135deg, #2230C2 0%, #5A66F0 55%, #8B95FF 100%)",
    accentGradient: "linear-gradient(135deg, #2230C2 0%, #5A66F0 100%)",
    badgeBg: "#E0E4FF",
    badgeText: "#1B26A0",
    icon: "✦",
  },
  success: {
    gradient: "linear-gradient(135deg, #047857 0%, #10B981 55%, #6EE7B7 100%)",
    accentGradient: "linear-gradient(135deg, #047857 0%, #10B981 100%)",
    badgeBg: "#D1FADF",
    badgeText: "#065F46",
    icon: "✓",
  },
  warning: {
    gradient: "linear-gradient(135deg, #B45309 0%, #F59E0B 55%, #FCD34D 100%)",
    accentGradient: "linear-gradient(135deg, #B45309 0%, #F59E0B 100%)",
    badgeBg: "#FEF0C7",
    badgeText: "#92400E",
    icon: "!",
  },
  danger: {
    gradient: "linear-gradient(135deg, #B91C1C 0%, #EF4444 55%, #FCA5A5 100%)",
    accentGradient: "linear-gradient(135deg, #B91C1C 0%, #EF4444 100%)",
    badgeBg: "#FEE4E2",
    badgeText: "#991B1B",
    icon: "!",
  },
  celebrate: {
    gradient:
      "linear-gradient(135deg, #2230C2 0%, #7C3AED 35%, #EC4899 70%, #FF6B4A 100%)",
    accentGradient: "linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)",
    badgeBg: "#FCE7F3",
    badgeText: "#9D174D",
    icon: "★",
  },
};

export function escapeHtml(s: unknown): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const formatCLP = (n: number | null | undefined): string => {
  const v = Number(n ?? 0);
  return `$${Math.round(v).toLocaleString("es-CL")}`;
};

/** Canonical 6-step transaction timeline (services collapse last 2 into one). */
export const TX_STEPS = [
  { key: "created", label: "Sala creada" },
  { key: "invited", label: "Comprador unido" },
  { key: "funds_secured", label: "Pago en custodia" },
  { key: "in_delivery", label: "Entrega / envío" },
  { key: "awaiting_buyer_review", label: "Revisión del comprador" },
  { key: "completed", label: "Pago liberado" },
] as const;

export type TimelineKey = typeof TX_STEPS[number]["key"];

/** Render the timeline as inline-styled <table>. activeKey = current step. */
function renderTimeline(activeKey?: TimelineKey, problem?: boolean): string {
  if (!activeKey) return "";
  const activeIdx = TX_STEPS.findIndex((s) => s.key === activeKey);
  if (activeIdx < 0) return "";
  const dotColor = problem ? TRADO.danger : TRADO.primary;
  const doneColor = problem ? TRADO.danger : TRADO.primary;

  const rows = TX_STEPS.map((step, i) => {
    const done = i < activeIdx;
    const active = i === activeIdx;
    const color = done || active ? doneColor : TRADO.border;
    const textColor = active ? TRADO.text : done ? TRADO.muted : "#A0A6B5";
    const fontWeight = active ? "600" : "500";
    const bg = active ? dotColor : done ? doneColor : TRADO.card;
    const ring = active
      ? `box-shadow:0 0 0 4px ${dotColor}1A;`
      : "";
    const inner = done
      ? `<span style="color:#fff;font-size:11px;line-height:14px;">&#10003;</span>`
      : "";
    const connector = i < TX_STEPS.length - 1
      ? `<div style="width:2px;height:14px;background:${
        i < activeIdx ? doneColor : TRADO.border
      };margin:2px auto;"></div>`
      : "";
    return `
      <tr>
        <td style="width:24px;vertical-align:top;padding:0;">
          <div style="width:16px;height:16px;border-radius:50%;border:2px solid ${color};background:${bg};${ring}text-align:center;line-height:12px;margin:2px auto 0;">${inner}</div>
          ${connector}
        </td>
        <td style="padding:0 0 8px 10px;vertical-align:top;">
          <div style="font-size:13px;color:${textColor};font-weight:${fontWeight};line-height:1.4;">${step.label}</div>
        </td>
      </tr>`;
  }).join("");

  return `
    <div style="margin:20px 0 4px;font-size:12px;color:${TRADO.muted};text-transform:uppercase;letter-spacing:0.06em;font-weight:600;">Progreso de la transacción</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;border-collapse:collapse;">
      ${rows}
    </table>`;
}

export interface SummaryRow {
  label: string;
  value: string;
  emphasis?: boolean;
}

export interface RenderEmailOptions {
  recipientName: string;
  headline: string; // Big H1 in the card
  statusLine?: string; // 1-line context above the call-out, e.g. "Fondos en custodia"
  intro?: string; // Optional intro paragraph (HTML allowed; pre-sanitized upstream)
  nextStep?: string; // Bold "Próximo paso" line
  ctaText?: string;
  ctaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  summaryTitle?: string; // e.g. "Detalles de la transacción"
  summaryRows?: SummaryRow[];
  timelineActive?: TimelineKey;
  timelineProblem?: boolean;
  referenceCode?: string; // e.g. invite_code → "#ABC12345"
  footerNote?: string;
  baseUrl?: string;
}

export function renderTransactionalEmail(o: RenderEmailOptions): string {
  const baseUrl = o.baseUrl || Deno.env.get("SITE_URL") || "https://trado.cl";

  const summary = o.summaryRows && o.summaryRows.length
    ? `<div style="background:${TRADO.bg};border:1px solid ${TRADO.border};border-radius:12px;padding:16px 18px;margin:0 0 20px;">
        ${
      o.summaryTitle
        ? `<div style="font-size:12px;color:${TRADO.muted};text-transform:uppercase;letter-spacing:0.06em;font-weight:600;margin-bottom:10px;">${o.summaryTitle}</div>`
        : ""
    }
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
          ${
      o.summaryRows.map((r, i) =>
        `<tr>
              <td style="padding:${
          i === 0 ? "0" : "8px"
        } 0 8px;border-top:${i === 0 ? "none" : `1px solid ${TRADO.border}`};font-size:13px;color:${TRADO.muted};">${r.label}</td>
              <td style="padding:${
          i === 0 ? "0" : "8px"
        } 0 8px;border-top:${i === 0 ? "none" : `1px solid ${TRADO.border}`};font-size:14px;color:${TRADO.text};font-weight:${r.emphasis ? "700" : "500"};text-align:right;">${r.value}</td>
            </tr>`
      ).join("")
    }
        </table>
      </div>`
    : "";

  const statusBlock = o.statusLine
    ? `<div style="background:#EEF0FE;border:1px solid #D6DAF7;border-radius:10px;padding:10px 14px;margin:0 0 16px;font-size:13px;color:${TRADO.primaryDark};font-weight:600;">${o.statusLine}</div>`
    : "";

  const nextStep = o.nextStep
    ? `<div style="margin:0 0 20px;padding:14px 16px;background:${TRADO.bg};border-left:3px solid ${TRADO.primary};border-radius:0 8px 8px 0;">
        <div style="font-size:12px;color:${TRADO.muted};text-transform:uppercase;letter-spacing:0.06em;font-weight:600;margin-bottom:4px;">Próximo paso</div>
        <div style="font-size:14px;color:${TRADO.text};line-height:1.5;">${o.nextStep}</div>
      </div>`
    : "";

  const cta = o.ctaText && o.ctaUrl
    ? `<div style="text-align:center;margin:24px 0 8px;">
        <a href="${o.ctaUrl}" style="display:inline-block;background:${TRADO.primary};color:#ffffff;font-size:15px;font-weight:600;border-radius:10px;padding:14px 28px;text-decoration:none;">${o.ctaText}</a>
        ${
      o.secondaryCtaText && o.secondaryCtaUrl
        ? `<div style="margin-top:12px;"><a href="${o.secondaryCtaUrl}" style="display:inline-block;color:${TRADO.primary};font-size:14px;font-weight:600;text-decoration:none;">${o.secondaryCtaText} →</a></div>`
        : ""
    }
      </div>`
    : "";

  const ref = o.referenceCode
    ? `<div style="font-size:12px;color:${TRADO.muted};margin:0 0 8px;">Referencia <span style="font-family:ui-monospace,'SF Mono',Menlo,monospace;color:${TRADO.text};font-weight:600;">#${o.referenceCode}</span></div>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${o.headline}</title>
</head>
<body style="margin:0;padding:0;background:${TRADO.bg};font-family:${TRADO.font};color:${TRADO.text};">
  <div style="max-width:560px;margin:32px auto;background:${TRADO.card};border:1px solid ${TRADO.border};border-radius:16px;overflow:hidden;">
    <div style="padding:28px 32px 0;">
      <div style="font-size:20px;font-weight:700;color:${TRADO.primary};letter-spacing:-0.02em;">Trado</div>
    </div>
    <div style="padding:20px 32px 28px;">
      ${ref}
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:${TRADO.text};letter-spacing:-0.01em;line-height:1.3;">${o.headline}</h1>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:${TRADO.muted};">
        Hola <strong style="color:${TRADO.text};">${o.recipientName}</strong>,${
    o.intro ? ` ${o.intro}` : ""
  }
      </p>
      ${statusBlock}
      ${summary}
      ${nextStep}
      ${renderTimeline(o.timelineActive, o.timelineProblem)}
      ${cta}
      ${
    o.footerNote
      ? `<p style="margin:18px 0 0;font-size:13px;color:${TRADO.muted};line-height:1.5;">${o.footerNote}</p>`
      : ""
  }
      <div style="border-top:1px solid ${TRADO.border};margin:28px 0 16px;"></div>
      <p style="margin:0;font-size:12px;color:${TRADO.muted};line-height:1.5;text-align:center;">
        Correo automático de <a href="${baseUrl}" style="color:${TRADO.primary};text-decoration:none;">Trado</a> · Tu plataforma segura para transacciones P2P en Chile.
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ---------- Threading ----------

export interface ThreadInfo {
  subjectPrefix: string;
  headers: Record<string, string>;
  isNewThread: boolean;
  anchorId?: string;
}

/**
 * Returns Gmail/Apple Mail threading headers for a transaction.
 * Stores first Message-ID in transactions.email_thread_id so all later emails
 * for the same transaction thread together. Subject must include `subjectPrefix`.
 */
export async function buildThreadHeaders(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  transactionId: string | null | undefined,
  referenceCode?: string | null,
): Promise<ThreadInfo> {
  const code = referenceCode || (transactionId
    ? transactionId.substring(0, 8).toUpperCase()
    : "");
  const subjectPrefix = code ? `[Trado #${code}]` : "[Trado]";
  if (!transactionId) {
    return { subjectPrefix, headers: {}, isNewThread: true };
  }
  try {
    const { data } = await supabase
      .from("transactions")
      .select("email_thread_id")
      .eq("id", transactionId)
      .maybeSingle();
    const anchorId = data?.email_thread_id as string | null | undefined;
    if (anchorId) {
      return {
        subjectPrefix,
        headers: {
          "In-Reply-To": anchorId,
          "References": anchorId,
        },
        isNewThread: false,
        anchorId,
      };
    }
  } catch (e) {
    console.error("[buildThreadHeaders] lookup failed", e);
  }
  // Generate a stable Message-ID anchor we will reuse.
  const anchorId = `<tx-${transactionId}@trado.cl>`;
  return {
    subjectPrefix,
    headers: { "Message-ID": anchorId },
    isNewThread: true,
    anchorId,
  };
}

/** Persists the thread anchor on the transaction once the first email is sent. */
export async function persistThreadAnchor(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  transactionId: string,
  anchorId: string,
): Promise<void> {
  try {
    await supabase
      .from("transactions")
      .update({ email_thread_id: anchorId })
      .eq("id", transactionId)
      .is("email_thread_id", null);
  } catch (e) {
    console.error("[persistThreadAnchor] failed", e);
  }
}

// ---------- Sender ----------

export interface SendEmailOptions {
  from?: string;
  to: string | string[];
  subject: string;
  html: string;
  headers?: Record<string, string>;
  replyTo?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<unknown> {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");
  const body = {
    from: opts.from || "Trado <notificaciones@trado.cl>",
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject,
    html: opts.html,
    headers: opts.headers,
    reply_to: opts.replyTo,
  };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("[sendEmail] Resend error", data);
    throw new Error(data?.message || "Resend send failed");
  }
  return data;
}

export const SITE_URL = () =>
  Deno.env.get("SITE_URL") || "https://trado.cl";

export const txUrl = (id: string) => `${SITE_URL()}/transaction/${id}`;
export const appealUrl = (id: string) => `${SITE_URL()}/appeal/${id}`;
export const walletUrl = () => `${SITE_URL()}/wallet`;
