/*eslint no-undef: "error"*/
/*eslint-env node*/

import { defineConfig } from "vite";
import reactRefresh from "@vitejs/plugin-react-refresh";
import path from "path";
import pkg from "./package.json";

const external = [
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.peerDependencies),
];

const globals = external.reduce((acc, name) => {
  acc[name] = name;
  return acc;
}, {});

export default defineConfig({
  plugins: [reactRefresh()],
  build: {
    minify: false,
    lib: {
      entry: path.resolve(__dirname, "src/index.tsx"),
      name: "react-hook-videojs",
      fileName: (format) => `react-hook-videojs.${format}.js`,
    },
    sourcemap: true,
    rollupOptions: {
      external,
      output: {
        globals,
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
  },
});
