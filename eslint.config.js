import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // Sólo artefactos de build: código generado por Vite y por Capacitor, que
    // no escribió nadie y cuyos avisos esconden los problemas reales.
    //
    // supabase/functions NO se excluye a propósito: corre en Deno pero es
    // código propio que mueve dinero, y sacarlo de aquí sería bajar el número
    // de errores sin arreglar ninguno.
    ignores: ["dist", "android/**"],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
);
