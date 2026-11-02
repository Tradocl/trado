import { describe, it, expect, vi } from "vitest";

// attribution.ts guarda en Supabase; acá sólo se prueban las funciones puras.
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

import { esNavegadorInterno, urlNavegadorExterno } from "./attribution";

const IG_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 345.0.0.0";
const IG_ANDROID = "Mozilla/5.0 (Linux; Android 14; SM-A546E; wv) AppleWebKit/537.36 Chrome/129.0 Mobile Safari/537.36 Instagram 350.0.0.0 Android";
const FB_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0]";
const SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1";

describe("navegador interno de Instagram y Facebook", () => {
  it("lo reconoce", () => {
    expect(esNavegadorInterno(IG_IPHONE)).toBe(true);
    expect(esNavegadorInterno(IG_ANDROID)).toBe(true);
    expect(esNavegadorInterno(FB_IPHONE)).toBe(true);
  });

  it("no molesta en un navegador normal", () => {
    expect(esNavegadorInterno(SAFARI)).toBe(false);
  });

  it("arma el link para salir conservando la URL", () => {
    const href = "https://www.trado.cl/auth?tab=register&utm_source=ig&utm_content=123";
    expect(urlNavegadorExterno(IG_ANDROID, href)).toBe(
      "intent://www.trado.cl/auth?tab=register&utm_source=ig&utm_content=123#Intent;scheme=https;end"
    );
    expect(urlNavegadorExterno(IG_IPHONE, href)).toBe(
      "x-safari-https://www.trado.cl/auth?tab=register&utm_source=ig&utm_content=123"
    );
  });
});
