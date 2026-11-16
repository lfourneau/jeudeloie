/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Règles partagées avec les Edge Functions (une seule source de vérité)
      "@rules": fileURLToPath(new URL("./supabase/functions/_shared/rules.ts", import.meta.url)),
      // Seul le plateau est importé côté front : questions.json ne doit jamais finir dans le bundle
      "@board": fileURLToPath(new URL("./content/board.json", import.meta.url)),
    },
  },
  test: {
    include: ["supabase/functions/_shared/**/*.test.ts", "src/**/*.test.ts"],
  },
});
