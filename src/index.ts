/**
 * astro-mail-obfuscation - SERVER
 *
 * Copyright (c) 2024-2026 Andreas Brunner
 * SPDX-License-Identifier: MIT
 */

import { env } from "node:process";
import { fileURLToPath } from "node:url";

import type { AstroIntegration } from "astro";
import JavaScriptObfuscator from "javascript-obfuscator";

import { encodeBase64 } from "./crypto.js";
import { generateAttributeName, type Config } from "./obfuscation.js";

export interface Options {
    markerAttributeName?: string;
    trustedTypesPolicyName?: string;
}

const AES_GCM_KEY_LENGTH_BYTES = 32;

export default function mailObfuscation(options: Options = {}): AstroIntegration {
    const markerAttributeName = options.markerAttributeName ?? "data-obfuscation";

    if (!/^data-[a-z0-9_-]+$/.test(markerAttributeName)) {
        throw new Error("Marker must be a lowercase data-* attribute; containing only letters, numbers, hyphens, or underscores.");
    }

    return {
        name: "astro-mail-obfuscation",
        hooks: {
            "astro:config:setup": async ({ config: astroConfig, updateConfig, injectScript, addMiddleware }) => {
                const integrationCount = astroConfig.integrations.filter(({ name }) => name === "astro-mail-obfuscation").length;
                if (integrationCount > 1) {
                    throw new Error("Integration must only be added once to an Astro configuration.");
                }

                const aesGcmKeyBytes = new Uint8Array(AES_GCM_KEY_LENGTH_BYTES);
                globalThis.crypto.getRandomValues(aesGcmKeyBytes);

                const ecdsaKeyPair = await globalThis.crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
                const [aesGcmKey, ecdsaPrivateKeyBuffer, ecdsaPublicKeyBuffer] = await Promise.all([
                    globalThis.crypto.subtle.importKey("raw", aesGcmKeyBytes, { name: "AES-GCM" }, false, ["encrypt"]),
                    globalThis.crypto.subtle.exportKey("pkcs8", ecdsaKeyPair.privateKey),
                    globalThis.crypto.subtle.exportKey("spki", ecdsaKeyPair.publicKey),
                ]);

                const ecdsaPrivateKeyBytes = new Uint8Array(ecdsaPrivateKeyBuffer);
                const ecdsaPublicKeyBytes = new Uint8Array(ecdsaPublicKeyBuffer);
                const payloadAttributeName = generateAttributeName([markerAttributeName]);

                const config: Config = {
                    aesGcmKey,
                    ecdsaPrivateKey: ecdsaKeyPair.privateKey,
                    payloadAttributeName,
                    pageAttributeName: generateAttributeName([markerAttributeName, payloadAttributeName]),
                    markerAttributeName,
                };

                const clientUrl = new URL("./client/index.js", import.meta.url);
                const clientPath = normalizeModuleId(fileURLToPath(clientUrl));

                updateConfig({
                    vite: {
                        define: {
                            ASTRO_MAIL_OBFUSCATION_AES_GCM_KEY_BASE64: JSON.stringify(encodeBase64(aesGcmKeyBytes)),
                            ASTRO_MAIL_OBFUSCATION_ECDSA_PRIVATE_KEY_BASE64: JSON.stringify(encodeBase64(ecdsaPrivateKeyBytes)),
                            ASTRO_MAIL_OBFUSCATION_ECDSA_PUBLIC_KEY_BASE64: JSON.stringify(encodeBase64(ecdsaPublicKeyBytes)),
                            ASTRO_MAIL_OBFUSCATION_PAYLOAD_ATTRIBUTE_NAME: JSON.stringify(config.payloadAttributeName),
                            ASTRO_MAIL_OBFUSCATION_PAGE_ATTRIBUTE_NAME: JSON.stringify(config.pageAttributeName),
                            ASTRO_MAIL_OBFUSCATION_MARKER_ATTRIBUTE_NAME: JSON.stringify(config.markerAttributeName),
                            ASTRO_MAIL_OBFUSCATION_TRUSTED_TYPES_POLICY_NAME: JSON.stringify(
                                options.trustedTypesPolicyName ?? `tt-${config.pageAttributeName.slice("data-".length)}`
                            ),
                        },

                        plugins: [
                            {
                                name: "astro-mail-obfuscation:vite",
                                apply: "build",
                                enforce: "post",
                                transform(code, id) {
                                    if (normalizeModuleId(id) !== clientPath) {
                                        return null;
                                    }

                                    return {
                                        code: obfuscateClientCode(code),
                                        map: null,
                                    };
                                },
                            },
                        ],
                    },
                });

                injectScript("page", `import ${JSON.stringify(clientUrl.href)};`);

                addMiddleware({
                    entrypoint: fileURLToPath(new URL("./middleware.js", import.meta.url)),
                    order: "pre",
                });
            },
        },
    };
}

function obfuscateClientCode(code: string): string {
    const previousCi = env.CI;

    try {
        env.CI = "1";

        return JavaScriptObfuscator.obfuscate(code, {
            compact: true,

            controlFlowFlattening: false,
            deadCodeInjection: false,
            debugProtection: false,

            identifierNamesGenerator: "mangled-shuffled",
            ignoreImports: true,
            numbersToExpressions: false,

            renameGlobals: false,
            renameProperties: false,

            seed: 0,
            selfDefending: false,
            simplify: true,

            splitStrings: false,

            stringArray: true,
            stringArrayCallsTransform: false,
            stringArrayEncoding: ["rc4"],
            stringArrayIndexesType: ["hexadecimal-number"],
            stringArrayIndexShift: true,
            stringArrayRotate: false,
            stringArrayShuffle: true,
            stringArrayWrappersCount: 1,
            stringArrayWrappersChainedCalls: false,
            stringArrayWrappersParametersMaxCount: 2,
            stringArrayWrappersType: "variable",
            stringArrayThreshold: 1,

            target: "browser",
            transformObjectKeys: false,
            unicodeEscapeSequence: false,
        }).getObfuscatedCode();
    } finally {
        if (previousCi === undefined) {
            delete env.CI;
        } else {
            env.CI = previousCi;
        }
    }
}

function normalizeModuleId(id: string): string {
    const queryIndex = id.indexOf("?");

    return (queryIndex === -1 ? id : id.slice(0, queryIndex)).replaceAll("\\", "/");
}
