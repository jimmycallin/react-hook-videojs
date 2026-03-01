import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  optimizeDeps: {
    include: ["react/jsx-dev-runtime"],
  },
  test: {
    include: ["packages/react-hook-videojs/src/**/*.test.ts?(x)"],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
      api: {
        host: "127.0.0.1",
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["packages/react-hook-videojs/src/**/*.ts?(x)"],
      exclude: ["packages/react-hook-videojs/src/**/*.test.ts?(x)"],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
