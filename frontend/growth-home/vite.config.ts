import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * IIFE bundle so dashboard.html can load Home with a classic <script> tag.
 * Avoids dynamic import() / ES-module graph issues next to growth-os-app.js.
 */
export default defineConfig({
  plugins: [react()],
  /**
   * Library IIFE runs in the browser as a classic script — there is no `process`.
   * Without this, React's conditional `process.env.NODE_ENV` throws before PostPlateGrowthHome is set.
   */
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    outDir: "../assets/growth-home",
    emptyOutDir: true,
    lib: {
      entry: "src/main.tsx",
      name: "PostPlateGrowthHome",
      formats: ["iife"],
      fileName: () => "growth-home.js",
    },
    rollupOptions: {
      output: {
        assetFileNames: "growth-home.[ext]",
        extend: true,
        name: "PostPlateGrowthHome",
      },
    },
  },
});
