import { describe, it, expect } from "vitest";
import * as cliente from "./utils";
import * as servidor from "../../supabase/functions/_shared/pricing";
import { UNVERIFIED_LIMITS } from "./escrow";

// Lo que la app promete al crear la sala tiene que ser lo que cobra process-escrow-deposit.
describe("primera sala sin comisión", () => {
  it("cliente y servidor usan el mismo tope y los mismos estados", () => {
    expect(cliente.PRIMERA_SALA_GRATIS_HASTA).toBe(servidor.PRIMERA_SALA_GRATIS_HASTA);
    expect([...cliente.ESTADOS_FINANCIADOS]).toEqual([...servidor.ESTADOS_FINANCIADOS]);
  });

  it("el tope es el límite por sala sin verificar", () => {
    expect(servidor.PRIMERA_SALA_GRATIS_HASTA).toBe(UNVERIFIED_LIMITS.PER_TRANSACTION);
  });

  it("aplica sólo a la primera y hasta el tope", () => {
    for (const f of [cliente.primeraSalaGratis, servidor.primeraSalaGratis]) {
      expect(f(100_000, 0)).toBe(true);
      expect(f(250_000, 0)).toBe(true);
      expect(f(250_001, 0)).toBe(false);
      expect(f(100_000, 1)).toBe(false);
      expect(f(0, 0)).toBe(false);
    }
  });
});
