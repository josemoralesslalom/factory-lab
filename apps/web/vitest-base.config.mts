import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        "src/app/**/services/**": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        "src/app/**/{pages,components}/**": {
          lines: 80,
          branches: 80,
          functions: 80,
          statements: 80,
        },
      },
    },
  },
});
