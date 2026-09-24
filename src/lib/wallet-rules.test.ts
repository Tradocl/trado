import { describe, expect, it } from "vitest";
import { reembolsableATarjeta, retirableAlBanco } from "./wallet-rules";

describe("retirableAlBanco", () => {
  it("la plata de tarjeta no usada no se puede retirar", () => {
    // Depositó $100.000 con tarjeta, la sala se canceló y volvió todo.
    expect(retirableAlBanco({ balance: 100_000, gatewayFunded: 100_000, pendingWithdrawals: 0 })).toBe(0);
  });

  it("lo recibido por una venta sí se retira", () => {
    expect(retirableAlBanco({ balance: 95_000, gatewayFunded: 0, pendingWithdrawals: 0 })).toBe(95_000);
  });

  it("con saldo mixto sólo sale la parte que no es de tarjeta", () => {
    expect(retirableAlBanco({ balance: 10_000, gatewayFunded: 3_000, pendingWithdrawals: 0 })).toBe(7_000);
  });

  it("descuenta los retiros ya pedidos", () => {
    expect(retirableAlBanco({ balance: 10_000, gatewayFunded: 3_000, pendingWithdrawals: 5_000 })).toBe(2_000);
  });

  it("una marca de tarjeta mayor al saldo no deja el resultado negativo", () => {
    expect(retirableAlBanco({ balance: 0, gatewayFunded: 1_000, pendingWithdrawals: 0 })).toBe(0);
    expect(retirableAlBanco({ balance: 500, gatewayFunded: 1_000, pendingWithdrawals: 0 })).toBe(0);
  });
});

describe("reembolsableATarjeta", () => {
  it("nunca supera el saldo", () => {
    expect(reembolsableATarjeta({ balance: 0, gatewayFunded: 1_000 })).toBe(0);
    expect(reembolsableATarjeta({ balance: 50_000, gatewayFunded: 80_000 })).toBe(50_000);
    expect(reembolsableATarjeta({ balance: 80_000, gatewayFunded: 50_000 })).toBe(50_000);
  });
});
