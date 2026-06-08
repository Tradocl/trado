// Sends one sample of every email template/variant to contacto@trado.cl
// for visual QA. Admin-only.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import * as React from "npm:react@18.3.1";
import { render } from "npm:@react-email/render@0.0.17";
import { requireServiceRole } from "../_shared/auth.ts";
import {
  formatCLP,
  renderTransactionalEmail,
  sendEmail,
} from "../_shared/email-templates/notification.ts";
import { SignupEmail } from "../_shared/email-templates/signup.tsx";
import { RecoveryEmail } from "../_shared/email-templates/recovery.tsx";
import { MagicLinkEmail } from "../_shared/email-templates/magic-link.tsx";
import { InviteEmail } from "../_shared/email-templates/invite.tsx";
import { EmailChangeEmail } from "../_shared/email-templates/email-change.tsx";
import { ReauthenticationEmail } from "../_shared/email-templates/reauthentication.tsx";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TO = "contacto@trado.cl";
const SITE = Deno.env.get("SITE_URL") || "https://trado.cl";
const SAMPLE_TX_ID = "11111111-2222-3333-4444-555555555555";
const REF = "TEST" + Math.random().toString(36).slice(2, 6).toUpperCase();

const PRODUCT = "iPhone 15 Pro 256GB — Titanio Natural";
const AMOUNT = 850000;
const COMMISSION = 20000;

interface TestEmail {
  name: string;
  subject: string;
  html: string;
}

function notif(opts: Parameters<typeof renderTransactionalEmail>[0]) {
  return renderTransactionalEmail(opts);
}

function txUrlSample() {
  return `${SITE}/transaction/${SAMPLE_TX_ID}`;
}

function buildAll(): TestEmail[] {
  const emails: TestEmail[] = [];

  // ---------- Notification-style emails ----------

  emails.push({
    name: "welcome",
    subject: "Bienvenido a Trado",
    html: notif({
      recipientName: "Camila",
      headline: "Bienvenida a Trado",
      eyebrow: "Cuenta creada",
      statusLine: "Tu cuenta está lista",
      tone: "celebrate",
      intro:
        "tu cuenta fue creada con éxito. Ya puedes crear salas de venta o aceptar invitaciones para comprar de forma segura.",
      nextStep:
        "Completa tu perfil y verifica tu identidad para desbloquear montos más altos.",
      ctaText: "Ir a mi panel",
      ctaUrl: `${SITE}/dashboard`,
      secondaryCtaText: "Verificar identidad",
      secondaryCtaUrl: `${SITE}/verification`,
    }),
  });

  emails.push({
    name: "verification-submitted",
    subject: "[Admin] Verificación pendiente · Camila Rojas",
    html: notif({
      recipientName: "equipo Trado",
      headline: "Nueva verificación de identidad",
      statusLine: "Pendiente de revisión",
      tone: "warning",
      summaryTitle: "Datos del usuario",
      summaryRows: [
        { label: "Nombre", value: "Camila Rojas" },
        { label: "Email", value: "camila@ejemplo.cl" },
        { label: "RUT", value: "12.345.678-9" },
        { label: "Teléfono", value: "+56 9 1234 5678" },
        { label: "Carnet", value: '<a href="#">Ver documento</a>' },
        { label: "Selfie", value: '<a href="#">Ver selfie</a>' },
      ],
      nextStep:
        "Revisá los archivos en el panel admin y aprobá o rechazá la verificación con un motivo claro.",
      ctaText: "Abrir panel admin",
      ctaUrl: `${SITE}/admin/verifications`,
    }),
  });

  emails.push({
    name: "verification-approved",
    subject: "Tu identidad fue verificada ✓",
    html: notif({
      recipientName: "Camila",
      headline: "¡Verificación aprobada!",
      eyebrow: "Identidad confirmada",
      statusLine: "Cuenta verificada",
      tone: "success",
      intro:
        "validamos tu identidad correctamente. Ahora tu cuenta tiene el sello de verificada y puedes operar sin límites.",
      nextStep:
        "Tu perfil público ahora muestra el badge de verificado, lo que aumenta la confianza con otros usuarios.",
      ctaText: "Ver mi perfil",
      ctaUrl: `${SITE}/profile`,
    }),
  });

  emails.push({
    name: "verification-rejected",
    subject: "Tu verificación necesita ajustes",
    html: notif({
      recipientName: "Camila",
      headline: "Verificación rechazada",
      statusLine: "Acción requerida",
      tone: "danger",
      intro:
        "no pudimos validar tu identidad con los documentos enviados.",
      summaryTitle: "Motivo del rechazo",
      summaryRows: [
        {
          label: "Detalle",
          value: "La foto del carnet está borrosa y no se lee el RUT.",
        },
      ],
      nextStep:
        "Vuelve a subir tu carnet en buena resolución y una selfie clara para reintentar la verificación.",
      ctaText: "Reintentar verificación",
      ctaUrl: `${SITE}/verification`,
    }),
  });

  emails.push({
    name: "tx-created-buyer",
    subject: `[Trado #${REF}] Nueva sala de venta · ${PRODUCT}`,
    html: notif({
      recipientName: "Camila",
      headline: "Te invitaron a una sala de venta",
      eyebrow: "Nueva transacción",
      statusLine: "Esperando tu confirmación",
      tone: "info",
      intro:
        "Diego Pérez creó una sala de venta contigo. Revisa los detalles y únete para coordinar el pago seguro.",
      summaryTitle: "Detalles de la operación",
      summaryRows: [
        { label: "Producto", value: PRODUCT },
        { label: "Monto", value: formatCLP(AMOUNT), emphasis: true },
        { label: "Vendedor", value: "Diego Pérez" },
        { label: "Tipo", value: "Producto con envío" },
      ],
      nextStep:
        "Acepta la invitación para asegurar los fondos en escrow. El vendedor sólo recibe el pago cuando confirmes la recepción.",
      ctaText: "Ver sala",
      ctaUrl: txUrlSample(),
      timelineActive: "invited",
      referenceCode: REF,
    }),
  });

  emails.push({
    name: "tx-created-seller",
    subject: `[Trado #${REF}] Sala creada · ${PRODUCT}`,
    html: notif({
      recipientName: "Diego",
      headline: "Sala de venta creada",
      eyebrow: "Esperando comprador",
      statusLine: "Invitación enviada",
      tone: "info",
      intro:
        "tu sala fue creada y la invitación viaja al comprador. Te avisaremos en cuanto se una.",
      summaryTitle: "Resumen",
      summaryRows: [
        { label: "Producto", value: PRODUCT },
        { label: "Monto", value: formatCLP(AMOUNT), emphasis: true },
        { label: "Comprador", value: "Camila Rojas" },
        { label: "Código de invitación", value: REF },
      ],
      nextStep:
        "Comparte el enlace si el comprador no recibe la invitación. Una vez que asegure los fondos, podrás coordinar el envío.",
      ctaText: "Ver sala",
      ctaUrl: txUrlSample(),
      timelineActive: "created",
      referenceCode: REF,
    }),
  });

  emails.push({
    name: "tx-funds-secured",
    subject: `[Trado #${REF}] Fondos asegurados`,
    html: notif({
      recipientName: "Diego",
      headline: "Fondos asegurados en escrow",
      statusLine: "Listo para enviar",
      tone: "success",
      intro:
        "Camila aseguró los fondos. Puedes proceder con el envío del producto con tranquilidad.",
      summaryTitle: "Resumen",
      summaryRows: [
        { label: "Producto", value: PRODUCT },
        { label: "Monto en escrow", value: formatCLP(AMOUNT), emphasis: true },
        { label: "Comprador", value: "Camila Rojas" },
      ],
      nextStep:
        "Marca el producto como enviado dentro de la sala y carga el código de seguimiento.",
      ctaText: "Ir a la sala",
      ctaUrl: txUrlSample(),
      timelineActive: "funds_secured",
      referenceCode: REF,
    }),
  });

  emails.push({
    name: "tx-in-delivery",
    subject: `[Trado #${REF}] Producto en camino`,
    html: notif({
      recipientName: "Camila",
      headline: "Tu producto va en camino",
      statusLine: "En envío",
      tone: "info",
      intro:
        "Diego marcó el producto como enviado. Pronto deberías recibirlo.",
      summaryTitle: "Seguimiento",
      summaryRows: [
        { label: "Producto", value: PRODUCT },
        { label: "Courier", value: "Starken" },
        { label: "Seguimiento", value: "STK-849201233" },
      ],
      nextStep:
        "Cuando recibas el producto y confirmes que está en buen estado, marca la recepción para liberar el pago al vendedor.",
      ctaText: "Ver sala",
      ctaUrl: txUrlSample(),
      timelineActive: "in_delivery",
      referenceCode: REF,
    }),
  });

  emails.push({
    name: "tx-awaiting-review",
    subject: `[Trado #${REF}] Producto entregado`,
    html: notif({
      recipientName: "Camila",
      headline: "Producto entregado",
      statusLine: "Periodo de revisión",
      tone: "info",
      intro:
        "el courier reportó la entrega. Tienes tiempo para revisarlo antes de confirmar la recepción.",
      nextStep:
        "Si todo está correcto, confirma la recepción y libera los fondos. Si hay un problema, abre una devolución dentro de la sala.",
      ctaText: "Confirmar recepción",
      ctaUrl: txUrlSample(),
      secondaryCtaText: "Reportar problema",
      secondaryCtaUrl: txUrlSample(),
      timelineActive: "awaiting_buyer_review",
      referenceCode: REF,
    }),
  });

  emails.push({
    name: "tx-completed",
    subject: `[Trado #${REF}] Transacción completada 🎉`,
    html: notif({
      recipientName: "Diego",
      headline: "¡Transacción completada!",
      eyebrow: "Pago liberado",
      statusLine: "Fondos disponibles",
      tone: "celebrate",
      intro:
        "Camila confirmó la recepción. Los fondos ya están disponibles en tu billetera Trado.",
      summaryTitle: "Resumen final",
      summaryRows: [
        { label: "Producto", value: PRODUCT },
        { label: "Monto bruto", value: formatCLP(AMOUNT) },
        { label: "Comisión Trado", value: `- ${formatCLP(COMMISSION)}` },
        {
          label: "Total recibido",
          value: formatCLP(AMOUNT - COMMISSION),
          emphasis: true,
        },
      ],
      nextStep:
        "Califica a Camila para ayudar a la comunidad y solicita un retiro a tu cuenta bancaria cuando lo necesites.",
      ctaText: "Ver mi billetera",
      ctaUrl: `${SITE}/wallet`,
      secondaryCtaText: "Calificar al comprador",
      secondaryCtaUrl: txUrlSample(),
      timelineActive: "completed",
      referenceCode: REF,
    }),
  });

  emails.push({
    name: "tx-cancelled",
    subject: `[Trado #${REF}] Sala cancelada`,
    html: notif({
      recipientName: "Camila",
      headline: "Sala cancelada",
      statusLine: "Sin movimiento de fondos",
      tone: "warning",
      intro:
        "la sala fue cancelada antes de asegurar fondos. No se realizó ningún cobro.",
      nextStep:
        "Puedes crear una nueva sala cuando estés listo.",
      ctaText: "Crear nueva sala",
      ctaUrl: `${SITE}/create-transaction`,
      referenceCode: REF,
    }),
  });

  emails.push({
    name: "tx-expired",
    subject: `[Trado #${REF}] Invitación expirada`,
    html: notif({
      recipientName: "Diego",
      headline: "La invitación expiró",
      statusLine: "Sin respuesta del comprador",
      tone: "warning",
      intro:
        "tu invitación a Camila expiró sin respuesta. La sala fue cerrada automáticamente.",
      nextStep:
        "Si aún quieres concretar la venta, crea una nueva sala y reenvía el enlace.",
      ctaText: "Crear nueva sala",
      ctaUrl: `${SITE}/create-transaction`,
      referenceCode: REF,
    }),
  });

  emails.push({
    name: "deposit-reminder",
    subject: `[Trado #${REF}] Recordatorio: completa tu depósito`,
    html: notif({
      recipientName: "Camila",
      headline: "Tu depósito aún está pendiente",
      statusLine: "Esperando transferencia",
      tone: "warning",
      intro:
        "hace 24 horas que aceptaste la invitación, pero aún no recibimos tu transferencia para asegurar los fondos.",
      summaryTitle: "Detalles para transferir",
      summaryRows: [
        { label: "Monto", value: formatCLP(AMOUNT), emphasis: true },
        { label: "Banco", value: "BCI" },
        { label: "Cuenta", value: "Cuenta Corriente 1234 5678" },
        { label: "RUT", value: "76.123.456-7" },
        { label: "Comentario obligatorio", value: REF },
      ],
      nextStep:
        "Realiza la transferencia con el código de comentario para que podamos identificarla.",
      ctaText: "Ver instrucciones",
      ctaUrl: txUrlSample(),
      referenceCode: REF,
    }),
  });

  emails.push({
    name: "payment-instructions",
    subject: `[Trado #${REF}] Instrucciones de pago`,
    html: notif({
      recipientName: "Camila",
      headline: "Asegura los fondos con una transferencia",
      statusLine: "Pago manual",
      tone: "info",
      intro:
        "para proteger la operación, transfiere el monto a la cuenta de Trado. Liberaremos el pago al vendedor sólo cuando confirmes la recepción.",
      summaryTitle: "Datos para transferir",
      summaryRows: [
        { label: "Monto exacto", value: formatCLP(AMOUNT), emphasis: true },
        { label: "Banco", value: "BCI" },
        { label: "Tipo", value: "Cuenta Corriente" },
        { label: "Número", value: "1234 5678" },
        { label: "RUT", value: "76.123.456-7" },
        { label: "Email", value: "pagos@trado.cl" },
        { label: "Comentario", value: REF },
      ],
      nextStep:
        "Una vez transferido, sube el comprobante en la sala. Nuestro equipo valida y libera los fondos al escrow.",
      ctaText: "Subir comprobante",
      ctaUrl: txUrlSample(),
      referenceCode: REF,
    }),
  });

  emails.push({
    name: "meeting-proposal",
    subject: `[Trado #${REF}] Propuesta de reunión`,
    html: notif({
      recipientName: "Camila",
      headline: "Diego propuso una reunión",
      statusLine: "Pendiente de aceptar",
      tone: "info",
      summaryTitle: "Detalles propuestos",
      summaryRows: [
        { label: "Día", value: "Sábado 14 de junio, 15:30" },
        { label: "Lugar", value: "Mall Costanera Center, entrada principal" },
        { label: "Producto", value: PRODUCT },
      ],
      nextStep:
        "Acepta la propuesta para fijar la entrega. Si no te acomoda, contraprópón una alternativa en la sala.",
      ctaText: "Responder propuesta",
      ctaUrl: txUrlSample(),
      referenceCode: REF,
    }),
  });

  emails.push({
    name: "wallet-deposit",
    subject: "Depósito acreditado en tu billetera Trado",
    html: notif({
      recipientName: "Camila",
      headline: "Depósito recibido",
      statusLine: "Saldo actualizado",
      tone: "success",
      summaryTitle: "Movimiento",
      summaryRows: [
        { label: "Tipo", value: "Depósito" },
        { label: "Monto", value: formatCLP(AMOUNT), emphasis: true },
        { label: "Saldo disponible", value: formatCLP(AMOUNT) },
      ],
      ctaText: "Ver billetera",
      ctaUrl: `${SITE}/wallet`,
    }),
  });

  emails.push({
    name: "wallet-withdrawal-requested",
    subject: "Solicitud de retiro recibida",
    html: notif({
      recipientName: "Diego",
      headline: "Solicitud de retiro recibida",
      statusLine: "En revisión",
      tone: "info",
      summaryTitle: "Detalle del retiro",
      summaryRows: [
        { label: "Monto", value: formatCLP(500000), emphasis: true },
        { label: "Banco", value: "Banco de Chile" },
        { label: "Cuenta", value: "**** 4321" },
      ],
      nextStep:
        "Procesaremos tu retiro en horario hábil. Te avisaremos cuando la transferencia salga.",
      ctaText: "Ver mis movimientos",
      ctaUrl: `${SITE}/wallet`,
    }),
  });

  emails.push({
    name: "wallet-withdrawal-completed",
    subject: "Retiro completado",
    html: notif({
      recipientName: "Diego",
      headline: "Retiro enviado a tu cuenta",
      statusLine: "Transferencia realizada",
      tone: "success",
      summaryTitle: "Detalle",
      summaryRows: [
        { label: "Monto", value: formatCLP(500000), emphasis: true },
        { label: "Banco destino", value: "Banco de Chile" },
        { label: "Cuenta", value: "**** 4321" },
        { label: "Referencia", value: "TRD-2026-0419" },
      ],
      nextStep:
        "Si no ves el abono dentro de 24h hábiles, contáctanos por soporte.",
      ctaText: "Ver historial",
      ctaUrl: `${SITE}/movements`,
    }),
  });

  emails.push({
    name: "wallet-escrow-release",
    subject: "Fondos liberados a tu billetera",
    html: notif({
      recipientName: "Diego",
      headline: "Liberación de escrow",
      statusLine: "Saldo disponible",
      tone: "success",
      summaryTitle: "Detalle",
      summaryRows: [
        { label: "Operación", value: PRODUCT },
        { label: "Monto bruto", value: formatCLP(AMOUNT) },
        { label: "Comisión Trado", value: `- ${formatCLP(COMMISSION)}` },
        {
          label: "Acreditado",
          value: formatCLP(AMOUNT - COMMISSION),
          emphasis: true,
        },
      ],
      ctaText: "Ver billetera",
      ctaUrl: `${SITE}/wallet`,
    }),
  });

  emails.push({
    name: "appeal-created",
    subject: `[Trado #${REF}] Apelación abierta`,
    html: notif({
      recipientName: "Diego",
      headline: "Se abrió una apelación",
      statusLine: "Periodo de negociación · 48h",
      tone: "warning",
      intro:
        "Camila abrió una apelación sobre esta transacción. Tienen 48 horas para llegar a un acuerdo antes de que un admin revise.",
      summaryTitle: "Motivo declarado",
      summaryRows: [
        { label: "Razón", value: "Producto distinto al anunciado" },
        {
          label: "Comentario",
          value:
            "El equipo llegó con una rayadura grande en la pantalla que no aparecía en las fotos.",
        },
      ],
      nextStep:
        "Sube tu evidencia (fotos, conversaciones) y propón una resolución mutua para evitar la mediación de un admin.",
      ctaText: "Abrir apelación",
      ctaUrl: `${SITE}/appeal/${SAMPLE_TX_ID}`,
      timelineProblem: true,
      referenceCode: REF,
    }),
  });

  emails.push({
    name: "appeal-escalated",
    subject: `[Trado #${REF}] Apelación escalada a Trado`,
    html: notif({
      recipientName: "Camila",
      headline: "Apelación escalada al equipo Trado",
      statusLine: "Revisión interna en curso",
      tone: "danger",
      intro:
        "no se llegó a un acuerdo mutuo dentro del plazo. Un administrador revisará la evidencia de ambas partes y tomará una decisión.",
      nextStep:
        "Si tienes evidencia adicional, súbela cuanto antes. Te avisaremos por correo cuando haya resolución.",
      ctaText: "Ver apelación",
      ctaUrl: `${SITE}/appeal/${SAMPLE_TX_ID}`,
      timelineProblem: true,
      referenceCode: REF,
    }),
  });

  emails.push({
    name: "appeal-resolved-refund",
    subject: `[Trado #${REF}] Apelación resuelta`,
    html: notif({
      recipientName: "Camila",
      headline: "Apelación resuelta",
      statusLine: "Resolución del administrador",
      tone: "info",
      intro:
        "un administrador resolvió la apelación. Los fondos fueron distribuidos según el detalle.",
      summaryTitle: "Detalles de la resolución",
      summaryRows: [
        { label: "Producto", value: PRODUCT },
        { label: "Monto original", value: formatCLP(AMOUNT) },
        { label: "Decisión", value: "Reembolso total al comprador" },
        {
          label: "Reembolso a tu billetera",
          value: formatCLP(AMOUNT - COMMISSION),
          emphasis: true,
        },
      ],
      nextStep:
        '<em>"Se acreditó la evidencia del comprador. El producto difería significativamente de lo publicado."</em>',
      ctaText: "Ver mi billetera",
      ctaUrl: `${SITE}/wallet`,
      timelineActive: "completed",
      referenceCode: REF,
    }),
  });

  emails.push({
    name: "appeal-mutual",
    subject: `[Trado #${REF}] Acuerdo mutuo confirmado`,
    html: notif({
      recipientName: "Diego",
      headline: "Acuerdo mutuo confirmado",
      statusLine: "Ambas partes acordaron",
      tone: "success",
      intro:
        "tú y Camila acordaron una distribución de fondos. Ya quedó aplicada en tu billetera.",
      summaryTitle: "Distribución",
      summaryRows: [
        { label: "Producto", value: PRODUCT },
        { label: "Monto original", value: formatCLP(AMOUNT) },
        { label: "Reembolso comprador", value: formatCLP(300000) },
        {
          label: "Pago a tu billetera",
          value: formatCLP(AMOUNT - 300000 - COMMISSION),
          emphasis: true,
        },
      ],
      ctaText: "Ver mi billetera",
      ctaUrl: `${SITE}/wallet`,
      referenceCode: REF,
    }),
  });

  emails.push({
    name: "return-requested",
    subject: `[Trado #${REF}] Solicitud de devolución`,
    html: notif({
      recipientName: "Diego",
      headline: "El comprador solicitó una devolución",
      statusLine: "Esperando tu respuesta",
      tone: "warning",
      summaryTitle: "Detalle",
      summaryRows: [
        { label: "Producto", value: PRODUCT },
        { label: "Motivo", value: "Producto con defectos" },
        {
          label: "Comentario",
          value: "El cargador no enciende. Probé con dos cables distintos.",
        },
      ],
      nextStep:
        "Acepta o rechaza la devolución dentro de la sala. Si la aceptas, definirán quién paga el envío de retorno.",
      ctaText: "Ver solicitud",
      ctaUrl: txUrlSample(),
      timelineProblem: true,
      referenceCode: REF,
    }),
  });

  emails.push({
    name: "return-refund-processed",
    subject: `[Trado #${REF}] Devolución completada`,
    html: notif({
      recipientName: "Camila",
      headline: "Devolución procesada",
      statusLine: "Reembolso aplicado",
      tone: "success",
      summaryTitle: "Resumen",
      summaryRows: [
        { label: "Producto", value: PRODUCT },
        { label: "Monto reembolsado", value: formatCLP(AMOUNT - COMMISSION), emphasis: true },
        { label: "Comisión Trado", value: formatCLP(COMMISSION) },
      ],
      nextStep:
        "El reembolso ya está disponible en tu billetera Trado. Puedes solicitarlo a tu cuenta bancaria cuando quieras.",
      ctaText: "Ver mi billetera",
      ctaUrl: `${SITE}/wallet`,
      referenceCode: REF,
    }),
  });

  emails.push({
    name: "support-submission",
    subject: "Recibimos tu mensaje de soporte",
    html: notif({
      recipientName: "Camila",
      headline: "Recibimos tu mensaje",
      statusLine: "Te respondemos en 24h hábiles",
      tone: "info",
      intro:
        "gracias por escribirnos. Un miembro del equipo Trado revisará tu caso y te responderá lo antes posible.",
      summaryTitle: "Tu mensaje",
      summaryRows: [
        { label: "Asunto", value: "No me llega el código de verificación" },
        {
          label: "Mensaje",
          value:
            "Hace 2 días intento verificar mi número pero no llega el SMS, ¿hay otra opción?",
        },
      ],
      ctaText: "Volver al centro de ayuda",
      ctaUrl: `${SITE}/support`,
    }),
  });

  // ---------- Auth React-Email templates ----------

  const authProps = {
    siteName: "Trado",
    siteUrl: SITE,
    recipient: TO,
    confirmationUrl: `${SITE}/auth/confirm?token=demo`,
  };

  emails.push({
    name: "auth-signup",
    subject: "[Auth] Confirma tu correo en Trado",
    html: render(React.createElement(SignupEmail, authProps)),
  });
  emails.push({
    name: "auth-recovery",
    subject: "[Auth] Recupera tu contraseña",
    html: render(
      React.createElement(RecoveryEmail, {
        siteName: "Trado",
        siteUrl: SITE,
        recoveryUrl: `${SITE}/reset-password?token=demo`,
      } as never),
    ),
  });
  emails.push({
    name: "auth-magic-link",
    subject: "[Auth] Tu enlace mágico de Trado",
    html: render(
      React.createElement(MagicLinkEmail, {
        siteName: "Trado",
        siteUrl: SITE,
        magicLinkUrl: `${SITE}/auth/magic?token=demo`,
      } as never),
    ),
  });
  emails.push({
    name: "auth-invite",
    subject: "[Auth] Te invitaron a Trado",
    html: render(
      React.createElement(InviteEmail, {
        siteName: "Trado",
        siteUrl: SITE,
        inviteUrl: `${SITE}/auth/invite?token=demo`,
      } as never),
    ),
  });
  emails.push({
    name: "auth-email-change",
    subject: "[Auth] Confirma tu nuevo correo",
    html: render(
      React.createElement(EmailChangeEmail, {
        siteName: "Trado",
        siteUrl: SITE,
        oldEmail: "viejo@ejemplo.cl",
        newEmail: "nuevo@ejemplo.cl",
        confirmationUrl: `${SITE}/auth/change?token=demo`,
      } as never),
    ),
  });
  emails.push({
    name: "auth-reauthentication",
    subject: "[Auth] Código de reautenticación",
    html: render(React.createElement(ReauthenticationEmail, { token: "123456" })),
  });

  return emails;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const fail = await requireServiceRole(req);
  if (fail) {
    return new Response(fail.body, {
      status: fail.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const emails = buildAll();
    const results: { name: string; ok: boolean; error?: string }[] = [];

    for (const e of emails) {
      try {
        await sendEmail({
          to: TO,
          subject: `[TEST] ${e.subject}`,
          html: e.html,
        });
        results.push({ name: e.name, ok: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[send-test-emails] failed", e.name, msg);
        results.push({ name: e.name, ok: false, error: msg });
      }
      // small delay to be gentle with Resend rate limits
      await new Promise((r) => setTimeout(r, 350));
    }

    const sent = results.filter((r) => r.ok).length;
    return new Response(
      JSON.stringify({ total: emails.length, sent, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[send-test-emails] fatal", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

// Deno serve helper
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
