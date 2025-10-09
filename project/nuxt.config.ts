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
  ssr: false,

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
                "./node_modules/monaco-editor/min/vs/**/*"
              )
            ),
            dest: "monaco-editor/min/vs",
          },
          {
            src: [
              normalizePath(
                path.resolve(
                  __dirname,
                  "./node_modules/lean4monaco/dist/lean4-infoview/*"
                )
              ),
              normalizePath(
                path.resolve(
                  __dirname,
                  "./node_modules/lean4monaco/dist/webview/webview.js"
                )
              ),
            ],
            dest: "infoview",
          },
          {
            src: [
              normalizePath(
                path.resolve(
                  __dirname,
                  "./node_modules/lean4monaco/dist/lean4-infoview/codicon.ttf"
                )
              ),
            ],
            dest: "assets",
          },
        ],
      }),
    ],
    optimizeDeps: {
      esbuildOptions: {
        plugins: [importMetaUrlPlugin],
      },
    },
  },
});
