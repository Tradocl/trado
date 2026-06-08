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

/**
 * Inline SVG microillustration that mirrors the current transaction state.
 * Rendered inside the gradient header for instant visual recognition.
 * Uses currentColor + white so it inherits the header palette.
 */
function renderStateIllustration(
  key?: TimelineKey,
  problem?: boolean,
): string {
  const stroke = "rgba(255,255,255,0.95)";
  const fill = "rgba(255,255,255,0.18)";
  const wrap = (svg: string, label: string) => `
    <div style="margin-top:18px;display:inline-block;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);border-radius:14px;padding:10px 14px 10px 10px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="vertical-align:middle;padding-right:10px;line-height:0;">${svg}</td>
        <td style="vertical-align:middle;font-size:13px;font-weight:600;color:#fff;letter-spacing:0.01em;">${label}</td>
      </tr></table>
    </div>`;

  if (problem) {
    return wrap(
      `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 5L33 30H3L18 5Z" fill="${fill}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M18 14V21" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="18" cy="25.5" r="1.5" fill="${stroke}"/>
      </svg>`,
      "Atención requerida",
    );
  }

  switch (key) {
    case "created":
      return wrap(
        `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="5" y="8" width="26" height="22" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
          <path d="M5 14H31" stroke="${stroke}" stroke-width="2"/>
          <path d="M18 19V25M15 22H21" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/>
          <circle cx="11" cy="5" r="1.5" fill="${stroke}"/>
          <circle cx="25" cy="5" r="1.5" fill="${stroke}"/>
          <path d="M11 5V8M25 5V8" stroke="${stroke}" stroke-width="2"/>
        </svg>`,
        "Sala creada",
      );
    case "invited":
      return wrap(
        `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="13" cy="14" r="4.5" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
          <circle cx="24" cy="16" r="3.5" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
          <path d="M4 29C4 24.5 8 22 13 22C18 22 22 24.5 22 29" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/>
          <path d="M20 29C20 25.5 22.5 24 24 24C25.5 24 28 25.5 28 29" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/>
        </svg>`,
        "Comprador unido",
      );
    case "funds_secured":
      return wrap(
        `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 4L31 9V18C31 25 25 30 18 32C11 30 5 25 5 18V9L18 4Z" fill="${fill}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
          <path d="M12 18L16.5 22.5L24 14.5" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`,
        "Pago en custodia",
      );
    case "in_delivery":
      return wrap(
        `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="11" width="17" height="13" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
          <path d="M20 15H27L32 20V24H20V15Z" fill="${fill}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
          <circle cx="10" cy="27" r="3" fill="#fff" stroke="${stroke}" stroke-width="2"/>
          <circle cx="25" cy="27" r="3" fill="#fff" stroke="${stroke}" stroke-width="2"/>
        </svg>`,
        "Entrega en camino",
      );
    case "awaiting_buyer_review":
      return wrap(
        `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 18C3 18 9 9 18 9C27 9 33 18 33 18C33 18 27 27 18 27C9 27 3 18 3 18Z" fill="${fill}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
          <circle cx="18" cy="18" r="4" fill="#fff" stroke="${stroke}" stroke-width="2"/>
        </svg>`,
        "Esperando revisión",
      );
    case "completed":
      return wrap(
        `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="18" cy="18" r="14" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
          <path d="M11 18.5L16 23.5L25 13" stroke="${stroke}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M30 6L32 4M4 32L6 30M32 30L30 32" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/>
        </svg>`,
        "Pago liberado",
      );
    default:
      return "";
  }
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
  headline: string;
  statusLine?: string;
  intro?: string;
  nextStep?: string;
  ctaText?: string;
  ctaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  summaryTitle?: string;
  summaryRows?: SummaryRow[];
  timelineActive?: TimelineKey;
  timelineProblem?: boolean;
  referenceCode?: string;
  footerNote?: string;
  baseUrl?: string;
  tone?: EmailTone;
  eyebrow?: string; // small label above headline, e.g. "Nueva transacción"
}

export function renderTransactionalEmail(o: RenderEmailOptions): string {
  const baseUrl = o.baseUrl || Deno.env.get("SITE_URL") || "https://trado.cl";
  const tone: EmailTone = o.tone || (o.timelineProblem ? "warning" : "info");
  const theme = TONE_THEMES[tone];

  const summary = o.summaryRows && o.summaryRows.length
    ? `<div style="background:${TRADO.bg};border:1px solid ${TRADO.border};border-radius:14px;padding:18px 20px;margin:0 0 22px;">
        ${
      o.summaryTitle
        ? `<div style="font-size:11px;color:${TRADO.muted};text-transform:uppercase;letter-spacing:0.08em;font-weight:700;margin-bottom:12px;">${o.summaryTitle}</div>`
        : ""
    }
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
          ${
      o.summaryRows.map((r, i) =>
        `<tr>
              <td style="padding:${
          i === 0 ? "0" : "10px"
        } 0 10px;border-top:${i === 0 ? "none" : `1px solid ${TRADO.border}`};font-size:13px;color:${TRADO.muted};">${r.label}</td>
              <td style="padding:${
          i === 0 ? "0" : "10px"
        } 0 10px;border-top:${i === 0 ? "none" : `1px solid ${TRADO.border}`};font-size:14px;color:${TRADO.text};font-weight:${r.emphasis ? "700" : "500"};text-align:right;">${r.value}</td>
            </tr>`
      ).join("")
    }
        </table>
      </div>`
    : "";

  const statusBlock = o.statusLine
    ? `<div style="background:${theme.badgeBg};border-radius:999px;padding:8px 16px;margin:0 0 18px;font-size:13px;color:${theme.badgeText};font-weight:600;display:inline-block;">
        <span style="margin-right:6px;">${theme.icon}</span>${o.statusLine}
      </div>`
    : "";

  const nextStep = o.nextStep
    ? `<div style="margin:0 0 22px;padding:16px 18px;background:linear-gradient(135deg, ${TRADO.bg} 0%, #FFFFFF 100%);border:1px solid ${TRADO.border};border-left:4px solid;border-image:${theme.accentGradient} 1;border-radius:0 12px 12px 0;">
        <div style="font-size:11px;color:${TRADO.muted};text-transform:uppercase;letter-spacing:0.08em;font-weight:700;margin-bottom:6px;">Próximo paso</div>
        <div style="font-size:14px;color:${TRADO.text};line-height:1.55;">${o.nextStep}</div>
      </div>`
    : "";

  const cta = o.ctaText && o.ctaUrl
    ? `<div style="text-align:center;margin:28px 0 8px;">
        <a href="${o.ctaUrl}" style="display:inline-block;background:${theme.accentGradient};background-color:${TRADO.primary};color:#ffffff;font-size:15px;font-weight:600;border-radius:12px;padding:15px 32px;text-decoration:none;box-shadow:0 8px 20px -8px rgba(34,48,194,0.5);">${o.ctaText}</a>
        ${
      o.secondaryCtaText && o.secondaryCtaUrl
        ? `<div style="margin-top:14px;"><a href="${o.secondaryCtaUrl}" style="display:inline-block;color:${TRADO.primary};font-size:14px;font-weight:600;text-decoration:none;">${o.secondaryCtaText} →</a></div>`
        : ""
    }
      </div>`
    : "";

  const ref = o.referenceCode
    ? `<div style="font-size:11px;color:rgba(255,255,255,0.85);margin:0;letter-spacing:0.04em;">REFERENCIA <span style="font-family:ui-monospace,'SF Mono',Menlo,monospace;color:#fff;font-weight:700;">#${o.referenceCode}</span></div>`
    : "";

  const eyebrow = o.eyebrow
    ? `<div style="font-size:11px;color:${TRADO.muted};text-transform:uppercase;letter-spacing:0.1em;font-weight:700;margin:0 0 8px;">${o.eyebrow}</div>`
    : "";

  const illo = renderStateIllustration(o.timelineActive, o.timelineProblem);

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${o.headline}</title>
</head>
<body style="margin:0;padding:0;background:${TRADO.bg};font-family:${TRADO.font};color:${TRADO.text};">
  <div style="max-width:580px;width:100%;margin:0 auto;background:${TRADO.card};border-radius:20px;overflow:hidden;box-shadow:0 4px 24px -8px rgba(15,20,36,0.12);box-sizing:border-box;">
    <!-- Colorful gradient header -->
    <div style="background:${theme.gradient};padding:28px 32px 24px;position:relative;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align:middle;">
            <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">Trado</div>
          </td>
          <td style="text-align:right;vertical-align:middle;">
            ${ref}
          </td>
        </tr>
      </table>
      ${illo}
      <div style="margin-top:18px;height:4px;width:48px;background:rgba(255,255,255,0.55);border-radius:2px;"></div>
    </div>
    <div style="padding:28px 32px 32px;">
      ${eyebrow}
      <h1 style="margin:0 0 14px;font-size:24px;font-weight:800;color:${TRADO.text};letter-spacing:-0.015em;line-height:1.25;">${o.headline}</h1>
      ${statusBlock}
      <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:${TRADO.muted};">
        Hola <strong style="color:${TRADO.text};">${o.recipientName}</strong>,${
    o.intro ? ` ${o.intro}` : ""
  }
      </p>
      ${summary}
      ${nextStep}
      ${renderTimeline(o.timelineActive, o.timelineProblem)}
      ${cta}
      ${
    o.footerNote
      ? `<p style="margin:20px 0 0;font-size:13px;color:${TRADO.muted};line-height:1.55;">${o.footerNote}</p>`
      : ""
  }
    </div>
    <!-- Footer band -->
    <div style="background:${TRADO.bg};padding:18px 32px;text-align:center;border-top:1px solid ${TRADO.border};">
      <p style="margin:0;font-size:12px;color:${TRADO.muted};line-height:1.5;">
        Correo automático de <a href="${baseUrl}" style="color:${TRADO.primary};text-decoration:none;font-weight:600;">Trado</a> · Transacciones P2P seguras en Chile 🇨🇱
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
  const subjectPrefix = code ? `Trado · ${code} ·` : `Trado ·`;
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
