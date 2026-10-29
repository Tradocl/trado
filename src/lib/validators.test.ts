import { describe, it, expect } from "vitest";
import { esRutEmpresa, validateRUT } from "./validators";

// El corte de 50 millones decide qué camino de registro y verificación ve cada cuenta.
describe("esRutEmpresa", () => {
  it("reconoce RUT de empresa desde 50.000.000", () => {
    expect(esRutEmpresa("76.123.456-0")).toBe(true);
    expect(esRutEmpresa("96500000-3")).toBe(true);
    expect(esRutEmpresa("50.000.000-7")).toBe(true);
  });

  it("deja como persona los RUT bajo 50.000.000", () => {
    expect(esRutEmpresa("12.345.678-5")).toBe(false);
    expect(esRutEmpresa("49.999.999-2")).toBe(false);
  });

  it("no confunde el dígito verificador con el número", () => {
    // "5.000.000-07" sin limpiar bien daría 50.000.000
    expect(esRutEmpresa("5000000-0")).toBe(false);
  });

  it("sin RUT o con basura no es empresa", () => {
    expect(esRutEmpresa(null)).toBe(false);
    expect(esRutEmpresa("")).toBe(false);
    expect(esRutEmpresa("abc")).toBe(false);
  });

  it("los ejemplos usados son RUT válidos", () => {
    for (const rut of ["76.123.456-0", "96500000-3", "50.000.000-7", "12.345.678-5", "49.999.999-2"]) {
      expect(validateRUT(rut)).toBe(true);
    }
  });
});
