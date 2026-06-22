import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", setupFiles: ["./test/setup.ts"], globals: true, passWithNoTests: true },
  resolve: { alias: { "@": resolve(__dirname, ".") } },
});
