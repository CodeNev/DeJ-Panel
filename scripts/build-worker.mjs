import { build } from "esbuild";
import { mkdirSync } from "node:fs";

mkdirSync("dist", { recursive: true });

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  outfile: "dist/worker-bundle.js",
  minify: true,
  conditions: ["worker", "browser"],
  external: ["better-sqlite3", "node:fs", "node:path", "node:util", "fs", "path", "util", "@hono/node-server"],
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});

console.log("Built dist/worker-bundle.js");
