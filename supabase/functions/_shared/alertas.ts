// Avisos cuando algo se rompe en un camino de dinero.
//
// Los tres bugs graves de la semana del 2026-09-13 —acuñación abierta, comisión
// neutralizada por un trigger, y el reembolso que movía plata antes de poder
// registrarla— se encontraron a mano, revisando. Ninguno avisó.
//
// El más caro fue el del reembolso: Mercado Pago devolvió $200.000, el registro
// falló, y nadie se enteró hasta que se miró la base por otra razón. Un correo
// en ese momento habría ahorrado la cuadratura manual y el riesgo de doble pago.
//
// Esto no reemplaza a un Sentry, pero cubre lo que de verdad duele: que la plata
// se mueva y los libros no se enteren.

import {
  ADMIN_ALERT_EMAIL,
  escapeHtml,
  renderTransactionalEmail,
  sendEmail,
} from "./email-templates/notification.ts";

export interface AlertaCritica {
  /** Qué función y qué falló. Va en el asunto. */
  resumen: string;
  /** Qué hay que hacer. Sé concreto: lo va a leer alguien apurado. */
  accion: string;
  /** Datos para ubicar el caso: ids, montos, lo que sirva. */
  contexto?: Record<string, unknown>;
  /** El error original, si lo hay. */
  error?: unknown;
}

/**
 * Avisa al equipo de una falla que dejó dinero en un estado inconsistente.
 *
 * NUNCA lanza: se llama desde rutas que ya están manejando un error, y que el
 * aviso falle no puede empeorar la situación. Siempre deja rastro en el log,
 * aunque el correo no salga.
 */
export async function alertarCritico(a: AlertaCritica): Promise<void> {
  const detalle = a.error instanceof Error
    ? a.error.message
    : a.error !== undefined
    ? String(a.error)
    : "";

  console.error(`[CRITICO] ${a.resumen}`, { accion: a.accion, ...a.contexto, detalle });

  try {
    const filas = Object.entries(a.contexto ?? {}).map(([label, value]) => ({
      label,
      value: escapeHtml(String(value)),
    }));
    if (detalle) filas.push({ label: "Error", value: escapeHtml(detalle) });

    await sendEmail({
      to: ADMIN_ALERT_EMAIL(),
      subject: `[CRÍTICO] ${a.resumen}`,
      html: renderTransactionalEmail({
        recipientName: "equipo Trado",
        headline: "Algo falló en un camino de dinero",
        eyebrow: "Requiere revisión manual",
        statusLine: escapeHtml(a.resumen),
        tone: "danger",
        intro:
          "una operación con dinero terminó en un estado que el sistema no pudo " +
          "resolver solo. Revísalo antes de que alguien lo note por su cuenta.",
        summaryTitle: "Detalles",
        summaryRows: filas.length ? filas : [{ label: "Sin contexto", value: "—" }],
        nextStep: escapeHtml(a.accion),
      }),
    });
  } catch (e) {
    // Si ni el aviso sale, al menos el log de arriba ya quedó escrito.
    console.error("[CRITICO] no se pudo enviar el aviso:", e);
  }
}
