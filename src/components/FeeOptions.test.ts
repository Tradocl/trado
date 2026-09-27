import { describe, expect, it } from "vitest";
import { feeOptions } from "./FeeOptions";

describe("feeOptions: la comisión según cómo se pague", () => {
  it("vendedor que crea una sala de $1.000.000: recibe más si le pagan por transferencia", () => {
    const o = feeOptions(1_000_000, "seller");
    expect(o.tarjeta).toBe(50_000);
    expect(o.transferencia).toBe(32_000);
    expect(o.conTarjeta).toBe(950_000);
    expect(o.conTransferencia).toBe(968_000);
    expect(o.ahorro).toBe(18_000);
    expect(o.transferenciaDisponible).toBe(true);
  });

  it("comprador que crea la sala: la comisión se suma a lo que paga", () => {
    const o = feeOptions(1_000_000, "buyer");
    expect(o.conTarjeta).toBe(1_050_000);
    expect(o.conTransferencia).toBe(1_032_000);
  });

  it("bajo el umbral la transferencia no se ofrece", () => {
    const o = feeOptions(100_000, "seller");
    expect(o.tarjeta).toBe(5_000);
    expect(o.transferenciaDisponible).toBe(false);
  });

  it("desde el umbral sí", () => {
    expect(feeOptions(400_000, "seller").transferenciaDisponible).toBe(true);
    expect(feeOptions(400_000, "seller").transferencia).toBe(14_000);
  });
});
