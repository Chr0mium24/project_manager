import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          environment: "jsdom",
          name: "unit",
          include: ["./test/**/*.unit.test.ts"]
        }
      },
      {
        test: {
          environment: "jsdom",
          name: "smoke",
          include: ["./test/**/*.smoke.test.ts"]
        }
      }
    ]
  }
});
