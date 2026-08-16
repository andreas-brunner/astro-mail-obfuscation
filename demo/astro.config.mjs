// @ts-check
import { defineConfig } from "astro/config";

import mailObfuscation from "astro-mail-obfuscation";

// https://astro.build/config
export default defineConfig({
    site: "https://andreas-brunner.github.io",
    base: "/astro-mail-obfuscation",

    compressHTML: false,
    build: {
        inlineStylesheets: "never",
    },

    integrations: [
        mailObfuscation({
            trustedTypesPolicyName: "dc9r3o2",
        }),
    ],
});
