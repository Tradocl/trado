import { describe, it, expect } from "vitest";
import {
  calculateOrderDetails,
  formatCLP,
  formatAmountInput,
  parseFormattedAmount,
  generateReferenceCode,
  MAX_TRANSACTION_AMOUNT,
  CUSTOM_PRICING_FROM,
  GATEWAY_COST_RATE,
  calculateFee,
  effectiveFeeRate,
  netMargin,
  transferSavings,
  calculateBlendedFee,
  qualifiesForCustomPricing,
} from "./utils";

// La comisión es la única aritmética de dinero que corre en el cliente y
// termina escrita en transactions.commission, así que un error acá se traduce
// directo en plata mal cobrada o mal pagada al vendedor.

describe("comisión con pasarela", () => {
  it("es 5% plano, sin tramos ni tope", () => {
    expect(calculateFee(100_000, "gateway")).toBe(5_000);
    expect(calculateFee(1_000_000, "gateway")).toBe(50_000);
    expect(calculateFee(2_000_000, "gateway")).toBe(100_000);
  });

  it("mantiene la tasa efectiva constante en 5% sea cual sea el monto", () => {
    for (const m of [50_000, 400_000, 1_150_000, 2_000_000]) {
      expect(effectiveFeeRate(m, "gateway")).toBeCloseTo(0.05, 4);
    }
  });

  it("deja ~1,4% neto porque la pasarela se lleva 3,6%", () => {
    // Es la razón por la que la pasarela NO se escala hacia abajo: no hay de
    // dónde recortar. El margen sale de empujar la transferencia.
    for (const m of [200_000, 1_000_000, 2_000_000]) {
      expect(netMargin(m, "gateway") / m).toBeCloseTo(0.05 - GATEWAY_COST_RATE, 4);
    }
  });

  it("respeta el mínimo de $1.000", () => {
    expect(calculateFee(5_000, "gateway")).toBe(1_000);
    expect(calculateFee(20_000, "gateway")).toBe(1_000);
  });
});

describe("comisión con transferencia", () => {
  it("cobra cada tramo sólo sobre la parte del monto que le corresponde", () => {
    // 400.000 al 3,5% = 14.000
    expect(calculateFee(400_000, "transfer")).toBe(14_000);
    // 14.000 + 3% de 750.000 = 36.500
    expect(calculateFee(1_150_000, "transfer")).toBe(36_500);
    // 36.500 + 2,5% de 850.000 = 57.750
    expect(calculateFee(2_000_000, "transfer")).toBe(57_750);
  });

  it("la tasa efectiva baja de forma monótona al subir el monto", () => {
    const montos = [100_000, 400_000, 600_000, 1_000_000, 1_500_000, 2_000_000];
    for (let i = 1; i < montos.length; i++) {
      expect(effectiveFeeRate(montos[i], "transfer")).toBeLessThanOrEqual(
        effectiveFeeRate(montos[i - 1], "transfer"),
      );
    }
    expect(effectiveFeeRate(400_000, "transfer")).toBeCloseTo(0.035, 4);
    expect(effectiveFeeRate(2_000_000, "transfer")).toBeCloseTo(0.0289, 3);
  });

  it("es continua: pagar un peso más nunca abarata la comisión", () => {
    // Sin este invariante habría escalones donde conviene inflar el monto,
    // que es justo lo que evitan los tramos marginales.
    for (const borde of [400_000, 1_150_000]) {
      const antes = calculateFee(borde, "transfer");
      const despues = calculateFee(borde + 1, "transfer");
      expect(despues).toBeGreaterThanOrEqual(antes);
      expect(despues - antes).toBeLessThan(100);
    }
  });

  it("todo lo cobrado es ganado: la pasarela no cobra nada", () => {
    for (const m of [200_000, 1_000_000, 2_000_000]) {
      expect(netMargin(m, "transfer")).toBe(calculateFee(m, "transfer"));
    }
  });

  it("nunca baja del 2,5%, que es el piso de margen aceptable", () => {
    for (const m of [100_000, 1_000_000, 2_000_000, 10_000_000]) {
      expect(effectiveFeeRate(m, "transfer")).toBeGreaterThanOrEqual(0.025);
    }
  });
});

describe("transferencia vs pasarela", () => {
  it("la transferencia siempre le sale más barata al usuario", () => {
    for (const m of [100_000, 400_000, 1_000_000, 2_000_000]) {
      expect(calculateFee(m, "transfer")).toBeLessThan(calculateFee(m, "gateway"));
      expect(transferSavings(m)).toBeGreaterThan(0);
    }
  });

  it("y al mismo tiempo le deja más margen a Trado", () => {
    // El punto del diseño: no es un descuento que se paga con margen propio,
    // es traspasar el costo de pasarela que se ahorra.
    for (const m of [200_000, 1_000_000, 2_000_000]) {
      expect(netMargin(m, "transfer")).toBeGreaterThan(netMargin(m, "gateway"));
    }
  });

  it("el ahorro crece con el monto, que es el gancho para operaciones grandes", () => {
    expect(transferSavings(2_000_000)).toBeGreaterThan(transferSavings(1_000_000));
    expect(transferSavings(1_000_000)).toBeGreaterThan(transferSavings(200_000));
    expect(transferSavings(2_000_000)).toBe(42_250);
  });
});

describe("comisión con saldo de origen mezclado", () => {
  it("cobra tarifa de tarjeta cuando todo el saldo entró por tarjeta", () => {
    const r = calculateBlendedFee(300_000, 1_000_000);
    expect(r.gatewayShare).toBe(1);
    expect(r.fee).toBe(calculateFee(300_000, "gateway"));
  });

  it("cobra tarifa de transferencia cuando no hay plata con marca", () => {
    const r = calculateBlendedFee(2_000_000, 0);
    expect(r.gatewayShare).toBe(0);
    expect(r.fee).toBe(calculateFee(2_000_000, "transfer"));
  });

  it("mezcla proporcionalmente cuando el saldo viene de ambos lados", () => {
    // El caso real: quedaron $685.000 de un depósito con tarjeta y el resto
    // entró por transferencia. 34,25% tarjeta / 65,75% limpio.
    const r = calculateBlendedFee(2_000_000, 685_000);
    expect(r.fromGateway).toBe(685_000);
    expect(r.fromClean).toBe(1_315_000);
    expect(r.gatewayShare).toBeCloseTo(0.3425, 4);
    expect(r.ifAllGateway).toBe(100_000);
    expect(r.ifAllTransfer).toBe(57_750);
    expect(r.fee).toBe(72_220);
    // Siempre entre las dos tarifas puras, nunca fuera de rango
    expect(r.fee).toBeGreaterThan(r.ifAllTransfer);
    expect(r.fee).toBeLessThan(r.ifAllGateway);
  });

  it("no deja que la plata de tarjeta pague tarifa barata: el arbitraje no rinde", () => {
    // Depositar con tarjeta y esperar pagar como transferencia era la fuga.
    // Con marca, esa plata siempre paga 5%, que es lo que cubre el costo.
    const monto = 1_000_000;
    const conMarca = calculateBlendedFee(monto, monto).fee;
    const sinMarca = calculateBlendedFee(monto, 0).fee;
    expect(conMarca).toBeGreaterThan(sinMarca);
    expect(conMarca).toBe(calculateFee(monto, "gateway"));
  });

  it("nunca cobra menos que la tarifa de transferencia ni más que la de tarjeta", () => {
    for (const marca of [0, 100_000, 500_000, 999_999, 5_000_000]) {
      for (const monto of [100_000, 500_000, 1_000_000, 2_000_000]) {
        const r = calculateBlendedFee(monto, marca);
        expect(r.fee).toBeGreaterThanOrEqual(r.ifAllTransfer);
        expect(r.fee).toBeLessThanOrEqual(r.ifAllGateway);
      }
    }
  });

  it("la comisión crece de forma monótona con la plata marcada", () => {
    // Mientras más saldo de tarjeta se use, más cara la sala. Sin saltos.
    let anterior = calculateBlendedFee(1_000_000, 0).fee;
    for (const marca of [200_000, 400_000, 600_000, 800_000, 1_000_000]) {
      const actual = calculateBlendedFee(1_000_000, marca).fee;
      expect(actual).toBeGreaterThanOrEqual(anterior);
      anterior = actual;
    }
  });

  it("ignora la marca que sobra del monto de la sala", () => {
    // Tener $5M marcados y hacer una sala de $1M sólo consume $1M.
    const r = calculateBlendedFee(1_000_000, 5_000_000);
    expect(r.fromGateway).toBe(1_000_000);
    expect(r.fromClean).toBe(0);
    expect(r.fee).toBe(calculateFee(1_000_000, "gateway"));
  });

  it("tolera valores negativos o basura en el saldo marcado", () => {
    expect(calculateBlendedFee(500_000, -100).fee).toBe(calculateFee(500_000, "transfer"));
    expect(calculateBlendedFee(0, 100).fee).toBe(0);
  });
});

describe("calculateOrderDetails", () => {
  it("descompone la orden y expone ambas tarifas para comparar", () => {
    const r = calculateOrderDetails(200_000, "gateway");
    expect(r.buyerPays).toBe(200_000);
    expect(r.appFee).toBe(10_000);
    expect(r.sellerReceives).toBe(190_000);
    expect(r.gatewayFee).toBe(10_000);
    expect(r.transferFee).toBe(7_000);
    expect(r.savings).toBe(3_000);
  });

  it("usa la tarifa del medio que se le indique", () => {
    expect(calculateOrderDetails(1_000_000, "transfer").appFee).toBe(32_000);
    expect(calculateOrderDetails(1_000_000, "gateway").appFee).toBe(50_000);
  });

  it("nunca deja al vendedor recibiendo más de lo que paga el comprador", () => {
    for (const metodo of ["gateway", "transfer"] as const) {
      for (const monto of [1_000, 33_333, 200_000, 400_000, 1_000_000, 2_000_000]) {
        const r = calculateOrderDetails(monto, metodo);
        expect(r.sellerReceives).toBe(r.buyerPays - r.appFee);
        expect(r.sellerReceives).toBeLessThan(r.buyerPays);
        expect(r.appFee).toBeGreaterThan(0);
      }
    }
  });

  it("redondea siempre a la decena", () => {
    expect(calculateOrderDetails(100_050).appFee % 10).toBe(0);
    expect(calculateFee(1_234_567, "transfer") % 10).toBe(0);
    expect(calculateFee(33_333, "gateway") % 10).toBe(0);
  });

  it("rechaza montos no positivos en vez de devolver una comisión inventada", () => {
    expect(() => calculateOrderDetails(0)).toThrow();
    expect(() => calculateOrderDetails(-1)).toThrow();
  });

  it("ofrece precio a medida desde $1.000.000 sin bloquear la operación", () => {
    expect(qualifiesForCustomPricing(999_999)).toBe(false);
    expect(qualifiesForCustomPricing(CUSTOM_PRICING_FROM)).toBe(true);
    // Ofrecer no es bloquear: hasta el máximo se sigue pudiendo operar solo.
    expect(CUSTOM_PRICING_FROM).toBeLessThan(MAX_TRANSACTION_AMOUNT);
    expect(() => calculateOrderDetails(MAX_TRANSACTION_AMOUNT)).not.toThrow();
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
