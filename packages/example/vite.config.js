import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [react()],
  resolve: {
    alias: {
      "react-hook-videojs": resolve(
        __dirname,
        "../react-hook-videojs/src/index.tsx",
      ),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
});
