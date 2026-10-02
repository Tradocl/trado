import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Toda función SQL que una Edge Function llama por rpc() y a la que alguna
 * migración le quitó EXECUTE a PUBLIC tiene que tener un GRANT posterior a
 * service_role. service_role se salta RLS pero NO los permisos de EXECUTE.
 *
 * Esto se rompió el 2026-09-13 (REVOKE ... FROM PUBLIC) y nadie lo notó hasta
 * que un pago real con tarjeta no se acreditó el 2026-10-02.
 */
const FUNCTIONS_DIR = join(__dirname, "../../supabase/functions");
const MIGRATIONS_DIR = join(__dirname, "../../supabase/migrations");

function rpcCalledByEdgeFunctions(): Set<string> {
  const names = new Set<string>();
  for (const dir of readdirSync(FUNCTIONS_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory() || dir.name.startsWith("_")) continue;
    let src: string;
    try {
      src = readFileSync(join(FUNCTIONS_DIR, dir.name, "index.ts"), "utf8");
    } catch {
      continue;
    }
    for (const m of src.matchAll(/\.rpc\(\s*["'`]([a-z_0-9]+)["'`]/g)) names.add(m[1]);
  }
  return names;
}

/** Último estado por función: true = service_role puede, false = se le quitó vía PUBLIC. */
function serviceRoleCanExecute(): Map<string, boolean> {
  const state = new Map<string, boolean>();
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, f), "utf8").replace(/--.*$/gm, "");
    for (const m of sql.matchAll(/(REVOKE|GRANT)\s+(?:EXECUTE|ALL)\s+ON\s+FUNCTION\s+public\.([a-z_0-9]+)\s*\([^)]*\)\s+(FROM|TO)\s+([^;]+);/gi)) {
      const [, verb, fn, , roles] = m;
      const r = roles.toLowerCase();
      if (verb.toUpperCase() === "REVOKE" && /\bpublic\b|\bservice_role\b/.test(r)) state.set(fn, false);
      if (verb.toUpperCase() === "GRANT" && /\bservice_role\b|\bpublic\b/.test(r)) state.set(fn, true);
    }
  }
  return state;
}

describe("permisos de las funciones de dinero", () => {
  it("service_role puede ejecutar todo lo que las Edge Functions llaman por rpc()", () => {
    const called = rpcCalledByEdgeFunctions();
    const state = serviceRoleCanExecute();
    const rotas = [...called].filter((fn) => state.get(fn) === false).sort();
    expect(rotas).toEqual([]);
  });

  it("detecta el caso real: credit_wallet_balance_with_origin la llama el webhook", () => {
    expect(rpcCalledByEdgeFunctions().has("credit_wallet_balance_with_origin")).toBe(true);
  });
});
