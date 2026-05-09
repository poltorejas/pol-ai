import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

// Helper to handle __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  // Vercel handles the base path automatically. 
  // Set to "/" unless you are deploying to a sub-directory.
  base: "/", 
  
  plugins: [
    react(),
    // Note: If you are using Tailwind v3, remove the tailwindcss() plugin 
    // from here and use postcss.config.js instead.
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // Adjusted assets path to be relative to your Vercel project root
      "@assets": path.resolve(__dirname, "assets"),
    },
    dedupe: ["react", "react-dom"],
  },

  // Standard Vite root is the current directory
  root: __dirname,

  build: {
    // Vercel expects the build output in "dist" by default
    outDir: "dist",
    emptyOutDir: true,
    // Ensure the build target is compatible with modern browsers
    target: "esnext",
  },

  server: {
    // Vercel overrides these during local 'vercel dev'
    port: 3000,
    strictPort: false,
    host: true,
  },
});
