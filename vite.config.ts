// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { readFileSync, existsSync } from "fs";

// Spike A fix: Vite doesn't auto-load .dev.vars (that's a wrangler behaviour).
// This plugin populates process.env at config-time so server functions can read
// TURSO_DATABASE_URL / TURSO_AUTH_TOKEN during `vite dev`.
function loadDevVars() {
  return {
    name: "load-dev-vars",
    config() {
      if (!existsSync(".dev.vars")) return;
      for (const line of readFileSync(".dev.vars", "utf8").split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq < 0) continue;
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim();
        if (key && !process.env[key]) process.env[key] = val;
      }
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [loadDevVars()],
  },
});
