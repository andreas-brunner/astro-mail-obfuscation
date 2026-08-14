/**
 * astro-mail-obfuscation - SERVER
 *
 * Copyright (c) 2024-2026 Andreas Brunner
 * SPDX-License-Identifier: MIT
 */

import type { MiddlewareHandler } from "astro";

import { decodeBase64 } from "./crypto.js";
import { containsMarkerAttribute, obfuscateHtml, type Config, type CheerioModule } from "./obfuscation.js";

declare const ASTRO_MAIL_OBFUSCATION_AES_GCM_KEY_BASE64: string;
declare const ASTRO_MAIL_OBFUSCATION_ECDSA_PRIVATE_KEY_BASE64: string;
declare const ASTRO_MAIL_OBFUSCATION_PAYLOAD_ATTRIBUTE_NAME: string;
declare const ASTRO_MAIL_OBFUSCATION_PAGE_ATTRIBUTE_NAME: string;
declare const ASTRO_MAIL_OBFUSCATION_MARKER_ATTRIBUTE_NAME: string;

const STALE_HEADERS = ["content-length", "content-encoding", "content-range", "accept-ranges", "etag", "content-digest", "digest", "content-md5"] as const;

let cheerioPromise: Promise<CheerioModule> | undefined;
let configPromise: Promise<Config> | undefined;

export const onRequest: MiddlewareHandler = async (_, next) => {
    const response = await next();

    if (response.status === 206) {
        return response;
    }

    const contentType = response.headers.get("content-type");
    const mimeType = contentType?.split(";", 1)[0]?.trim().toLowerCase();

    if (mimeType !== "text/html") {
        return response;
    }

    const html = await response.clone().text();
    if (!containsMarkerAttribute(html, ASTRO_MAIL_OBFUSCATION_MARKER_ATTRIBUTE_NAME)) {
        return response;
    }

    const [cheerio, config] = await Promise.all([getCheerio(), getConfig()]);

    const obfuscatedHtml = await obfuscateHtml(html, config, cheerio);
    if (obfuscatedHtml === null) {
        return response;
    }

    await response.body?.cancel().catch(() => undefined);

    return createResponseWithBody(response, obfuscatedHtml);
};

function getCheerio(): Promise<CheerioModule> {
    cheerioPromise ??= import("cheerio");

    return cheerioPromise;
}

function getConfig(): Promise<Config> {
    configPromise ??= Promise.all([
        globalThis.crypto.subtle.importKey("raw", decodeBase64(ASTRO_MAIL_OBFUSCATION_AES_GCM_KEY_BASE64), { name: "AES-GCM" }, false, ["encrypt"]),
        globalThis.crypto.subtle.importKey(
            "pkcs8",
            decodeBase64(ASTRO_MAIL_OBFUSCATION_ECDSA_PRIVATE_KEY_BASE64),
            { name: "ECDSA", namedCurve: "P-256" },
            false,
            ["sign"]
        ),
    ]).then(([aesGcmKey, ecdsaPrivateKey]) => ({
        aesGcmKey,
        ecdsaPrivateKey,
        payloadAttributeName: ASTRO_MAIL_OBFUSCATION_PAYLOAD_ATTRIBUTE_NAME,
        pageAttributeName: ASTRO_MAIL_OBFUSCATION_PAGE_ATTRIBUTE_NAME,
        markerAttributeName: ASTRO_MAIL_OBFUSCATION_MARKER_ATTRIBUTE_NAME,
    }));

    return configPromise;
}

function createResponseWithBody(response: Response, body: string): Response {
    const headers = new Headers(response.headers);
    for (const header of STALE_HEADERS) {
        headers.delete(header);
    }

    headers.set("content-type", "text/html; charset=utf-8");

    return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}
