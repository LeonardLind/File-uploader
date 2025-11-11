import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // 🧩 Prevent Vite from trying to optimize FFmpeg (it breaks the worker)
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/core"],
  },

  // 🧠 Optional: ensure FFmpeg is split into its own chunk in production
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          ffmpeg: ["@ffmpeg/ffmpeg", "@ffmpeg/core"],
        },
      },
    },
  },
});
