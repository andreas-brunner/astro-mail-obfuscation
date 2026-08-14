import { defineConfig } from "tsdown";

export default defineConfig([
    {
        entry: ["src/index.ts", "src/middleware.ts"],
        fixedExtension: false,
        minify: true,
        deps: {
            onlyBundle: [],
        },
    },
    {
        entry: "src/client/index.ts",
        outDir: "dist/client",
        platform: "browser",
        target: "es2022",
        dts: false,
        minify: true,
        deps: {
            onlyBundle: [],
        },
    },
]);
