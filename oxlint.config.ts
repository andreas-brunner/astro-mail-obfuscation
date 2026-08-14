import { defineConfig } from "oxlint";

export default defineConfig({
    options: {
        typeAware: true,
        typeCheck: true,
        reportUnusedDisableDirectives: "error",
    },
    categories: {
        correctness: "error",
        suspicious: "error",
    },
    rules: {
        "typescript/no-floating-promises": "error",
        "typescript/no-misused-promises": "error",
        "typescript/no-unsafe-argument": "error",
        "typescript/no-unsafe-assignment": "error",
        "typescript/no-unsafe-call": "error",
        "typescript/no-unsafe-member-access": "error",
        "typescript/no-unsafe-return": "error",
        "typescript/switch-exhaustiveness-check": "error",
    },
});
