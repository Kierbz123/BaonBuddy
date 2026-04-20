import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  // Use './' so Capacitor WebView can resolve assets from the local file system.
  base: './',

  plugins: [
    react(),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "react": path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
    },
  },

  server: {
    port: 3000,
    host: true,
  },

  // ── @xenova/transformers: exclude from Vite's pre-bundler ──────────────────
  // transformers.js uses dynamic import() and Web Workers internally.
  // Vite's dep-optimizer (esbuild) cannot handle this correctly and produces
  // broken chunks.  Excluding it lets Rollup process it at build time instead.
  optimizeDeps: {
    exclude: ['@xenova/transformers'],
  },

  build: {
    outDir: 'dist',
    sourcemap: true,

    rollupOptions: {
      output: {
        manualChunks: {
          'chart': ['chart.js', 'react-chartjs-2'],
          'vendor': ['framer-motion', 'localforage', 'date-fns'],
          // transformers.js is large — keep it in its own chunk so it
          // doesn't inflate the main bundle or other chunks.
          'transformers': ['@xenova/transformers'],
        },
      },
    },

    // @xenova/transformers + ONNX produce large chunks; raise the warning
    // threshold so the build doesn't error on legitimate large files.
    chunkSizeWarningLimit: 5000,
  },
});
