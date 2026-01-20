import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    watchExclude: ["**/node_modules/**", "**/lean_project/**", "**/.lake/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "app/**/*.ts",
        "app/**/*.vue",
        "server/**/*.ts",
        "shared/**/*.ts",
      ],
      exclude: ["**/*.d.ts", "**/node_modules/**"],
    },
  },
  server: {
    watch: {
      ignored: ["**/lean_project/**", "**/.lake/**"],
    },
  },
  resolve: {
    alias: {
      "#shared": resolve(__dirname, "./shared"),
      "#server": resolve(__dirname, "./server"),
      "~": resolve(__dirname, "./app"),
      "#app": resolve(__dirname, "./tests/mocks/nuxt"),
      "#imports": resolve(__dirname, "./tests/mocks/nuxt"),
    },
  },
});
