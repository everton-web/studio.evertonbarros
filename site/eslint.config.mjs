import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Legado estático (fora do app Next): index.html, css/, js/, send-form.php
    "js/**",
    // Exports estáticos servidos pelo site, não fonte do app.
    "public/relatorio/**",
  ]),
]);

export default eslintConfig;
