import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react({ jsxRuntime: "automatic" })],
  test: {
    globals: true,
    setupFiles: ["./src/test-setup.js"],
    environmentMatchGlobs: [
      ["src/**/*.test.{jsx,tsx,js,ts}", "jsdom"],
      ["tests/**/*.test.{js,ts}", "node"],
    ],
  },
});
