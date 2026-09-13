import { describe, it, expect } from "vitest";
import {
  REVIEW_HOURS,
  DEFAULT_REVIEW_HOURS,
  APPEAL_NEGOTIATION_HOURS,
  STALE_TRANSACTION_HOURS,
  TRANSICIONES_DE_USUARIO,
  ESTADOS_CON_ESCROW,
  ESTADOS_FINALES,
  reviewHoursFor,
  reviewPeriodLabel,
  tieneEscrowVivo,
  esEstadoFinal,
} from "./escrow";

// Estos valores aparecen en los Términos y Condiciones, que es un documento
// legal. Si el código cambia y el texto no, Trado estaría prometiendo algo que
// no cumple. Los tests existen para que eso no pase en silencio.

describe("plazos de revisión", () => {
  it("fija los plazos por tipo de venta que declaran los Términos", () => {
    expect(REVIEW_HOURS.producto_envio).toBe(72);
    expect(REVIEW_HOURS.producto_persona).toBe(24);
    expect(REVIEW_HOURS.servicio).toBe(24);
  });

  it("cae a 24 horas ante un tipo desconocido, nunca a cero", () => {
    // Un 0 liberaría el pago al instante, sin ventana para reclamar.
    expect(reviewHoursFor("tipo_que_no_existe")).toBe(DEFAULT_REVIEW_HOURS);
    expect(reviewHoursFor(null)).toBe(DEFAULT_REVIEW_HOURS);
    expect(reviewHoursFor(undefined)).toBe(DEFAULT_REVIEW_HOURS);
    expect(reviewHoursFor("")).toBeGreaterThan(0);
  });

  it("da más tiempo al producto con envío que a la entrega en persona", () => {
    // Tiene sentido: con envío el comprador ni siquiera lo tiene en la mano.
    expect(REVIEW_HOURS.producto_envio).toBeGreaterThan(REVIEW_HOURS.producto_persona);
  });

  it("entrega el texto para el FAQ y los Términos desde una sola fuente", () => {
    expect(reviewPeriodLabel("producto_envio")).toBe("72 horas");
    expect(reviewPeriodLabel("servicio")).toBe("24 horas");
  });

  it("fija los otros plazos que el usuario ve por escrito", () => {
    expect(APPEAL_NEGOTIATION_HOURS).toBe(48);
    expect(STALE_TRANSACTION_HOURS).toBe(72);
  });
});

describe("estados con plata adentro", () => {
  it("reconoce los cuatro estados donde hay escrow retenido", () => {
    expect(ESTADOS_CON_ESCROW).toEqual([
      "funds_secured",
      "in_delivery",
      "awaiting_buyer_review",
      "return_in_progress",
    ]);
  });

  it("no considera con escrow a los estados previos al depósito", () => {
    for (const s of ["created", "invited", "awaiting_deposit"]) {
      expect(tieneEscrowVivo(s)).toBe(false);
    }
  });

  it("no considera con escrow a los estados finales", () => {
    // Es el invariante que permite desplegar funciones de dinero sin riesgo.
    for (const s of ESTADOS_FINALES) {
      expect(tieneEscrowVivo(s)).toBe(false);
    }
  });

  it("ningún estado es a la vez final y con escrow", () => {
    for (const s of ESTADOS_CON_ESCROW) {
      expect(esEstadoFinal(s)).toBe(false);
    }
  });
});

describe("transiciones que puede hacer un usuario", () => {
  it("nunca permite saltar directo a completed desde antes del depósito", () => {
    // Sería liberarle el pago al vendedor sin que exista plata retenida.
    expect(TRANSICIONES_DE_USUARIO.created ?? []).not.toContain("completed");
    expect(TRANSICIONES_DE_USUARIO.invited ?? []).not.toContain("completed");
  });

  it("no deja cancelar una sala que ya tiene fondos", () => {
    // Cancelar con plata adentro tiene que pasar por devolución o disputa,
    // nunca por una transición directa del usuario.
    for (const estado of ESTADOS_CON_ESCROW) {
      expect(TRANSICIONES_DE_USUARIO[estado] ?? []).not.toContain("cancelled");
    }
  });

  it("deja abrir disputa desde cualquier estado con plata retenida", () => {
    // Si hay dinero de por medio, siempre tiene que haber una salida.
    for (const estado of ESTADOS_CON_ESCROW) {
      if (estado === "return_in_progress") continue; // ya viene de un reclamo
      expect(TRANSICIONES_DE_USUARIO[estado] ?? []).toContain("in_dispute");
    }
  });

  it("los estados finales no tienen salida", () => {
    for (const s of ESTADOS_FINALES) {
      expect(TRANSICIONES_DE_USUARIO[s]).toBeUndefined();
    }
  });

  it("ninguna transición apunta a un estado que no existe", () => {
    const validos = new Set([
      ...Object.keys(TRANSICIONES_DE_USUARIO),
      ...ESTADOS_CON_ESCROW,
      ...ESTADOS_FINALES,
      "invited", "awaiting_deposit", "return_requested", "in_dispute",
    ]);
    for (const [desde, destinos] of Object.entries(TRANSICIONES_DE_USUARIO)) {
      for (const d of destinos) {
        expect(validos.has(d), `${desde} -> ${d} apunta a un estado inexistente`).toBe(true);
      }
    }
  });
});
