import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  build: {
    outDir: "../static/js",
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "src/main.jsx"),
      formats: ["es"],
      fileName: () => "chat-bundle.js",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
