import { defineConfig } from "tsup";
import pkg from "./package.json";

export default defineConfig({
  entry: { "cli/index": "src/cli/index.ts" },
  format: ["esm"],
  target: "node18",
  dts: false,
  clean: true,
  bundle: true,
  skipNodeModulesBundle: false,
  splitting: false,
  sourcemap: false,
  banner: { js: "#!/usr/bin/env node" },
  define: {
    __PKG_NAME__: JSON.stringify(pkg.name),
    __PKG_VERSION__: JSON.stringify(pkg.version),
    __PKG_REPOSITORY__: JSON.stringify(
      typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url ?? ""
    ),
  },
});
