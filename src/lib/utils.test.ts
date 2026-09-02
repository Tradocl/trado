import { describe, it, expect } from "vitest";
import {
  calculateOrderDetails,
  formatCLP,
  formatAmountInput,
  parseFormattedAmount,
  generateReferenceCode,
  MAX_TRANSACTION_AMOUNT,
  CUSTOM_PRICING_FROM,
  calculateFee,
  effectiveFeeRate,
  qualifiesForCustomPricing,
} from "./utils";

// La comisión es la única aritmética de dinero que corre en el cliente y
// termina escrita en transactions.commission, así que un error acá se traduce
// directo en plata mal cobrada o mal pagada al vendedor.
describe("calculateOrderDetails - comisión", () => {
  it("aplica 5% dentro del primer tramo", () => {
    // 200.000 cae entero en el primer tramo: 5%
    const r = calculateOrderDetails(200_000);
    expect(r.appFee).toBe(10_000);
    expect(r.buyerPays).toBe(200_000);
    expect(r.sellerReceives).toBe(190_000);
  });

  it("respeta el piso de $1.000 en montos chicos", () => {
    // 5% de 5.000 = 250, por debajo del piso
    expect(calculateOrderDetails(5_000).appFee).toBe(1_000);
    expect(calculateOrderDetails(1_000).appFee).toBe(1_000);
  });

  it("cobra cada tramo sólo sobre la parte del monto que le corresponde", () => {
    // 400.000 al 5% = 20.000
    expect(calculateFee(400_000)).toBe(20_000);
    // 20.000 + 3,5% de 750.000 = 46.250
    expect(calculateFee(1_150_000)).toBe(46_250);
    // 46.250 + 2,5% de 850.000 = 67.500
    expect(calculateFee(2_000_000)).toBe(67_500);
  });

  it("la tasa efectiva baja de forma monótona al subir el monto", () => {
    // Es la propiedad que se le promete al cliente grande: mientras más
    // grande la operación, menor el porcentaje.
    const montos = [100_000, 400_000, 600_000, 1_000_000, 1_500_000, 2_000_000];
    for (let i = 1; i < montos.length; i++) {
      expect(effectiveFeeRate(montos[i])).toBeLessThanOrEqual(
        effectiveFeeRate(montos[i - 1]),
      );
    }
    expect(effectiveFeeRate(400_000)).toBeCloseTo(0.05, 4);
    expect(effectiveFeeRate(2_000_000)).toBeCloseTo(0.03375, 4);
  });

  it("es continua: pagar un peso más nunca abarata la comisión", () => {
    // Sin este invariante habría escalones donde conviene inflar el monto,
    // que es justo lo que evitan los tramos marginales.
    for (const borde of [400_000, 1_150_000]) {
      expect(calculateFee(borde + 1)).toBeGreaterThanOrEqual(calculateFee(borde));
      expect(calculateFee(borde + 1) - calculateFee(borde)).toBeLessThan(100);
    }
  });

  it("nunca cobra menos que el mínimo de $1.000", () => {
    expect(calculateFee(1_000)).toBe(1_000);
    expect(calculateFee(20_000)).toBe(1_000);
    expect(calculateFee(20_001)).toBe(1_000);
  });

  it("ofrece precio a medida desde $1.000.000 sin bloquear la operación", () => {
    expect(qualifiesForCustomPricing(999_999)).toBe(false);
    expect(qualifiesForCustomPricing(CUSTOM_PRICING_FROM)).toBe(true);
    // Ofrecer no es bloquear: hasta el máximo se sigue pudiendo operar solo.
    expect(CUSTOM_PRICING_FROM).toBeLessThan(MAX_TRANSACTION_AMOUNT);
    expect(() => calculateOrderDetails(MAX_TRANSACTION_AMOUNT)).not.toThrow();
  });

  it("redondea al múltiplo de 10 más cercano", () => {
    // 5% de 100.050 = 5.002,5 -> 5.000
    expect(calculateOrderDetails(100_050).appFee % 10).toBe(0);
    // 5% de 33.333 = 1.666,65 -> 1.670
    expect(calculateOrderDetails(33_333).appFee).toBe(1_670);
    // También en el tramo alto, donde la aritmética deja decimales
    expect(calculateFee(1_234_567) % 10).toBe(0);
  });

  it("nunca deja al vendedor recibiendo más de lo que paga el comprador", () => {
    for (const monto of [1_000, 33_333, 200_000, 400_000, 1_000_000, 2_000_000]) {
      const r = calculateOrderDetails(monto);
      expect(r.sellerReceives).toBe(r.buyerPays - r.appFee);
      expect(r.sellerReceives).toBeLessThan(r.buyerPays);
      expect(r.appFee).toBeGreaterThan(0);
    }
  });

  it("rechaza montos no positivos en vez de devolver una comisión inventada", () => {
    expect(() => calculateOrderDetails(0)).toThrow();
    expect(() => calculateOrderDetails(-1)).toThrow();
  });

  it("entrega un código de referencia con el formato esperado", () => {
    expect(calculateOrderDetails(50_000).referenceCode).toMatch(/^TR-[A-Z0-9]{4}$/);
  });
});

describe("formato de montos CLP", () => {
  it("formatea con separador de miles chileno y sin decimales", () => {
    expect(formatCLP(12_500)).toBe("12.500");
    expect(formatCLP(1_000_000)).toBe("1.000.000");
    expect(formatCLP(999)).toBe("999");
  });

  it("redondea en vez de truncar", () => {
    expect(formatCLP(1_500.6)).toBe("1.501");
  });

  it("formatea input descartando lo no numérico", () => {
    expect(formatAmountInput("1500000")).toBe("1.500.000");
    expect(formatAmountInput("abc1500def")).toBe("1.500");
    expect(formatAmountInput("")).toBe("");
  });

  it("parsea de vuelta lo que formateó (ida y vuelta)", () => {
    for (const n of [999, 1_500, 200_000, 10_000_000]) {
      expect(parseFormattedAmount(formatAmountInput(String(n)))).toBe(n);
    }
  });

  it("parsea entradas inválidas como 0 en vez de NaN", () => {
    expect(parseFormattedAmount("")).toBe(0);
    expect(parseFormattedAmount("abc")).toBe(0);
  });
});

describe("generateReferenceCode", () => {
  it("respeta el formato TR-XXXX", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateReferenceCode()).toMatch(/^TR-[A-Z0-9]{4}$/);
    }
  });

  it("no repite el mismo código de forma sistemática", () => {
    const codigos = new Set(Array.from({ length: 200 }, generateReferenceCode));
    // 36^4 combinaciones: 200 muestras deberían dar casi todas distintas.
    expect(codigos.size).toBeGreaterThan(190);
  });
});
