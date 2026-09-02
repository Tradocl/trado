import { describe, it, expect } from "vitest";
import {
  calculateOrderDetails,
  formatCLP,
  formatAmountInput,
  parseFormattedAmount,
  generateReferenceCode,
} from "./utils";

// La comisión es la única aritmética de dinero que corre en el cliente y
// termina escrita en transactions.commission, así que un error acá se traduce
// directo en plata mal cobrada o mal pagada al vendedor.
describe("calculateOrderDetails - comisión", () => {
  it("aplica 5% en el rango donde no topa ni el piso ni el techo", () => {
    // 5% de 200.000 = 10.000, entre el piso (1.000) y el techo (20.000)
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

  it("respeta el techo de $20.000 en montos grandes", () => {
    // 5% de 2.000.000 sería 100.000; el techo lo deja en 20.000 (1% efectivo)
    expect(calculateOrderDetails(2_000_000).appFee).toBe(20_000);
    // A mayor monto, menor porcentaje efectivo. Es el argumento comercial
    // para clientes grandes, así que conviene que quede fijado en un test.
    expect(calculateOrderDetails(10_000_000).appFee).toBe(20_000);
  });

  it("marca los bordes exactos donde el piso y el techo toman el control", () => {
    // 5% = 1.000 justo en 20.000
    expect(calculateOrderDetails(20_000).appFee).toBe(1_000);
    // 5% = 20.000 justo en 400.000
    expect(calculateOrderDetails(400_000).appFee).toBe(20_000);
    // Un peso más y sigue topado
    expect(calculateOrderDetails(400_001).appFee).toBe(20_000);
  });

  it("redondea al múltiplo de 10 más cercano", () => {
    // 5% de 100.050 = 5.002,5 -> 5.000
    expect(calculateOrderDetails(100_050).appFee % 10).toBe(0);
    // 5% de 33.333 = 1.666,65 -> 1.670
    expect(calculateOrderDetails(33_333).appFee).toBe(1_670);
  });

  it("nunca deja al vendedor recibiendo más de lo que paga el comprador", () => {
    for (const monto of [1_000, 33_333, 200_000, 400_000, 2_000_000, 10_000_000]) {
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
