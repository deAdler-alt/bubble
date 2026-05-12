import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const API_PORT = process.env.VITE_API_PORT ?? "3001";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    target: "es2022",
    // Sourcemapy tylko w dev/preview. W prod zwiększają payload i czas cold-startu.
    sourcemap: mode !== "production",
    // esbuild (default) — szybszy i mały. Wymusza minify CSS razem.
    minify: "esbuild",
    cssMinify: true,
    // Próg do podświetlenia „za duży chunk” — 350 KB raw (~110 KB gzipped to dobry cel).
    chunkSizeWarningLimit: 350,
    rollupOptions: {
      output: {
        /**
         * Manualny code-split: rdzeń Reacta (z jsx-runtime), framer-motion
         * i ikony lecą osobno, żeby zmiana w 1 ekranie nie unieważniała
         * cache vendorów. Forma funkcyjna łapie też zależności podrzędne
         * (scheduler, react-reconciler itd.) i hostowane pod-paty (`react/jsx-runtime`).
         */
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
            return "react-vendor";
          }
          if (id.includes("framer-motion") || id.includes("motion-dom") || id.includes("motion-utils")) {
            return "motion-vendor";
          }
          if (id.includes("lucide-react")) {
            return "icons-vendor";
          }
          return undefined;
        },
      },
    },
  },
}));
