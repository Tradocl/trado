import { describe, it, expect } from "vitest";
import { UNVERIFIED_LIMITS } from "./escrow";

// Estos topes son control de riesgo, no decoración de interfaz. La autoridad
// real es enforce_unverified_limits() en la base; estos tests fijan el espejo
// del frontend para que los dos no se separen sin que nadie lo note.

describe("límites de usuario sin verificar", () => {
  it("fija los topes vigentes", () => {
    expect(UNVERIFIED_LIMITS.PER_TRANSACTION).toBe(250_000);
    expect(UNVERIFIED_LIMITS.TOTAL_ACCUMULATED).toBe(500_000);
  });

  it("el acumulado deja hacer al menos dos operaciones al tope", () => {
    // Es la razón del cambio: con los valores viejos ($100.000 / $200.000) la
    // segunda compra ya topaba y obligaba a verificar en mitad de la operación.
    expect(UNVERIFIED_LIMITS.TOTAL_ACCUMULATED)
      .toBeGreaterThanOrEqual(UNVERIFIED_LIMITS.PER_TRANSACTION * 2);
  });

  it("no supera el máximo operable de la plataforma", () => {
    // Un tope sin verificar por encima de MAX_TRANSACTION_AMOUNT sería
    // inalcanzable y por lo tanto mentiroso.
    expect(UNVERIFIED_LIMITS.PER_TRANSACTION).toBeLessThanOrEqual(2_000_000);
  });

  it("son montos redondos en pesos, sin decimales", () => {
    for (const v of Object.values(UNVERIFIED_LIMITS)) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v % 1000).toBe(0);
    }
  });
});
