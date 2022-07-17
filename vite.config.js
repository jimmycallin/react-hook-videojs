/*eslint no-undef: "error"*/
/*eslint-env node*/

import { defineConfig } from "vite";
import reactRefresh from "@vitejs/plugin-react-refresh";
import path from "path";

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
      external: [
        "react",
        "react-dom",
        "video.js",
        "lodash.clonedeep",
        "dequal",
      ],
      output: {
        globals: {
          react: "React",
          "video.js": "videojs",
          "lodash.clonedeep": "lodash.clonedeep",
          dequal: "dequal",
        },
      },
    },
  },
});
