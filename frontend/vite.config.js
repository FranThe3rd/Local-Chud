import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "../static/js",
    emptyOutDir: false,
    lib: {
      entry: "src/main.jsx",
      formats: ["es"],
      fileName: "chat-bundle",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
