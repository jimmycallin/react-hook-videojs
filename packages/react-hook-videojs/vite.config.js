import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import pkg from "./package.json";

const __dirname = dirname(fileURLToPath(import.meta.url));

const external = [
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.peerDependencies),
];

export default defineConfig({
  plugins: [react()],
  build: {
    minify: false,
    lib: {
      entry: resolve(__dirname, "src/index.tsx"),
      name: "react-hook-videojs",
      formats: ["es"],
      fileName: () => "react-hook-videojs.es.js",
    },
    sourcemap: true,
    rollupOptions: {
      external,
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
  },
});
