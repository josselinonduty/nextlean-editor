// https://nuxt.com/docs/api/configuration/nuxt-config
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { normalizePath } from "vite";
import path from "node:path";
import importMetaUrlPlugin from "@codingame/esbuild-import-meta-url-plugin";

export default defineNuxtConfig({
  modules: ["@nuxt/ui"],
  css: ["~/assets/css/main.css"],

  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  nitro: {
    experimental: {
      websocket: true,
    },
    devServer: {
      watch: [],
    },
  },

  alias: {
    "@server": new URL("./server", import.meta.url).pathname,
    "#server": new URL("./server", import.meta.url).pathname,
  },

  vite: {
    plugins: [
      nodePolyfills({
        overrides: {
          fs: "memfs",
        },
      }),
      viteStaticCopy({
        targets: [
          {
            src: normalizePath(
              path.resolve(
                __dirname,
                "./node_modules/monaco-editor/min/vs/**/*",
              ),
            ),
            dest: "monaco-editor/min/vs",
          },
          // Infoview and related assets removed; using built-in Monaco without lean-specific assets
        ],
      }),
    ],
    optimizeDeps: {
      esbuildOptions: {
        plugins: [importMetaUrlPlugin],
      },
    },
  },

  runtimeConfig: {
    openRouterApiKey: "",
  },
});
