import { describe, expect, it } from "vitest";
// La regla vive en las Edge Functions (Deno) y no importa nada: se prueba directo.
import { splitResolution } from "../../supabase/functions/_shared/pricing";

const cuadra = (r: ReturnType<typeof splitResolution>) =>
  r.buyerFinal + r.sellerFinal + r.commissionCharged === r.escrow;

describe("splitResolution: una sola regla para acuerdos y decisiones del admin", () => {
  describe("sala creada por el vendedor (escrow = precio)", () => {
    const base = { amount: 100_000, commission: 5_000, initiatorRole: "seller" };

    it("a favor del vendedor: comisión entera, descontada de su parte", () => {
      const r = splitResolution({ ...base, buyerPart: 0, sellerPart: 100_000 });
      expect(r).toEqual({ escrow: 100_000, buyerFinal: 0, sellerFinal: 95_000, commissionCharged: 5_000 });
      expect(cuadra(r)).toBe(true);
    });

    it("reembolso total: sin comisión", () => {
      const r = splitResolution({ ...base, buyerPart: 100_000, sellerPart: 0 });
      expect(r).toEqual({ escrow: 100_000, buyerFinal: 100_000, sellerFinal: 0, commissionCharged: 0 });
    });

    it("mitad y mitad: media comisión", () => {
      const r = splitResolution({ ...base, buyerPart: 50_000, sellerPart: 50_000 });
      expect(r.commissionCharged).toBe(2_500);
      expect(r.sellerFinal).toBe(47_500);
      expect(cuadra(r)).toBe(true);
    });
  });

  describe("sala creada por el comprador (escrow = precio + comisión prepagada)", () => {
    const base = { amount: 100_000, commission: 5_000, initiatorRole: "buyer" };

    it("a favor del vendedor: recibe el precio, no la comisión del comprador", () => {
      const r = splitResolution({ ...base, buyerPart: 0, sellerPart: 100_000 });
      expect(r).toEqual({ escrow: 105_000, buyerFinal: 0, sellerFinal: 100_000, commissionCharged: 5_000 });
    });

    it("reembolso total: el comprador recupera también la comisión prepagada", () => {
      const r = splitResolution({ ...base, buyerPart: 100_000, sellerPart: 0 });
      expect(r).toEqual({ escrow: 105_000, buyerFinal: 105_000, sellerFinal: 0, commissionCharged: 0 });
    });

    it("mitad y mitad: se cobra media comisión y la otra mitad vuelve al comprador", () => {
      const r = splitResolution({ ...base, buyerPart: 50_000, sellerPart: 50_000 });
      expect(r).toEqual({ escrow: 105_000, buyerFinal: 52_500, sellerFinal: 50_000, commissionCharged: 2_500 });
      expect(cuadra(r)).toBe(true);
    });
  });

  it("rechaza montos que no suman el precio", () => {
    expect(() =>
      splitResolution({ amount: 100_000, commission: 5_000, initiatorRole: "seller", buyerPart: 40_000, sellerPart: 50_000 }),
    ).toThrow();
  });

  it("rechaza montos negativos", () => {
    expect(() =>
      splitResolution({ amount: 100_000, commission: 5_000, initiatorRole: "seller", buyerPart: 110_000, sellerPart: -10_000 }),
    ).toThrow();
  });
});
