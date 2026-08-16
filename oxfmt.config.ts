import { defineConfig } from "oxfmt";

export default defineConfig({
    overrides: [
        {
            files: ["demo/astro.config.mjs"],
            options: {
                sortImports: false,
            },
        },
    ],
    printWidth: 160,
    proseWrap: "never",
    sortImports: true,
    tabWidth: 4,
    trailingComma: "es5",
});
