import { describe, expect, it } from "vitest";
// La regla vive en las Edge Functions (Deno); el archivo no importa nada, así
// que se prueba directo desde acá.
import { gatewayMarkToRestore } from "../../supabase/functions/_shared/pricing";

describe("gatewayMarkToRestore: la plata de tarjeta vuelve como tarjeta", () => {
  it("reembolso total de una sala pagada con tarjeta: vuelve todo marcado", () => {
    expect(gatewayMarkToRestore(100_000, 100_000, 100_000)).toBe(100_000);
  });

  it("sala pagada sin tarjeta: no hay nada que marcar", () => {
    expect(gatewayMarkToRestore(100_000, 0, 100_000)).toBe(0);
  });

  it("mitad tarjeta, reembolso de la mitad: toda la tarjeta vuelve primero", () => {
    // Antes (proporcional) volvían sólo 25.000 marcados y 25.000 de tarjeta
    // quedaban retirables al banco.
    expect(gatewayMarkToRestore(100_000, 50_000, 50_000)).toBe(50_000);
  });

  it("se devuelve menos que la tarjeta usada: se marca todo lo devuelto", () => {
    expect(gatewayMarkToRestore(100_000, 100_000, 30_000)).toBe(30_000);
  });

  it("sala iniciada por el comprador (escrow = monto + comisión): no marca más de lo usado", () => {
    expect(gatewayMarkToRestore(100_000, 105_000, 105_000)).toBe(105_000);
    expect(gatewayMarkToRestore(100_000, 40_000, 105_000)).toBe(40_000);
  });

  it("nada devuelto, nada marcado", () => {
    expect(gatewayMarkToRestore(100_000, 100_000, 0)).toBe(0);
  });
});
