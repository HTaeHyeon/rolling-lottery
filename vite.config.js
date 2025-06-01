import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/rolling-lottery/", // GitHub Pages용 base path
  build: {
    outDir: "dist",
  },
  server: {
    port: 3000,
    open: true,
  },
});
