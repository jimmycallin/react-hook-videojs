import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, isAbsolute, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const isThirdPartyImport = (id) => {
  if (id.startsWith("\0")) {
    return false;
  }
  if (isAbsolute(id)) {
    return false;
  }
  return !id.startsWith(".") && !id.startsWith("/");
};

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
      external: isThirdPartyImport,
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
  },
});
