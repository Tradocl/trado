import { describe, it, expect } from "vitest";
import { rutaInternaSegura } from "./redirect";

describe("rutaInternaSegura", () => {
  it("deja pasar rutas internas", () => {
    expect(rutaInternaSegura("/transaction/abc")).toBe("/transaction/abc");
    expect(rutaInternaSegura("/wallet?tab=retiros")).toBe("/wallet?tab=retiros");
  });

  it("rechaza lo que el navegador o el router leen como otro dominio", () => {
    expect(rutaInternaSegura("//sitio-falso.com")).toBeNull();
    expect(rutaInternaSegura("/\\sitio-falso.com")).toBeNull();
    expect(rutaInternaSegura("https://sitio-falso.com")).toBeNull();
    expect(rutaInternaSegura("/\tsitio")).toBeNull();
  });

  it("sin ruta no hay redirección", () => {
    expect(rutaInternaSegura(null)).toBeNull();
    expect(rutaInternaSegura("")).toBeNull();
  });
});
