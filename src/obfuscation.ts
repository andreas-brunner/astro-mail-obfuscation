/**
 * astro-mail-obfuscation - SERVER
 *
 * Copyright (c) 2024-2026 Andreas Brunner
 * SPDX-License-Identifier: MIT
 */

import { isTag } from "domhandler";

import { encrypt, generateRandomHex } from "./crypto.js";
import { HTML_NAMESPACE, selectAndValidateObfuscationTargets } from "./validation.js";

export type CheerioModule = typeof import("cheerio");

type AttributeEntry = [attributeName: string, attributeValue: string];

export interface Config {
    aesGcmKey: CryptoKey;
    ecdsaPrivateKey: CryptoKey;
    payloadAttributeName: string;
    pageAttributeName: string;
    markerAttributeName: string;
}

const LAYOUT_ATTRIBUTE_NAMES = new Set([
    "id",
    "class",
    "style",
    "hidden",
    "inert",
    "lang",
    "dir",
    "width",
    "height",
    "rows",
    "cols",
    "size",
    "colspan",
    "rowspan",
    "span",
]);

const STATE_ATTRIBUTE_NAMES = new Set(["disabled", "readonly", "required", "multiple", "checked", "selected", "open", "popover", "type"]);

export function containsMarkerAttribute(html: string, markerAttributeName: string): boolean {
    return html.toLowerCase().includes(markerAttributeName.toLowerCase());
}

export async function obfuscateHtml(html: string, config: Config, cheerio: CheerioModule): Promise<string | null> {
    const select = cheerio.load(html);
    const targets = selectAndValidateObfuscationTargets(html, select, cheerio, config.markerAttributeName);
    if (targets.length === 0) {
        return null;
    }

    let hasPayload = false;
    for (const element of targets.toArray()) {
        if (!isTag(element)) {
            continue;
        }

        const selection = select(element);

        const attributes: AttributeEntry[] = Object.entries(element.attribs).filter(([attributeName]) => {
            const lowerName = attributeName.toLowerCase();
            return lowerName !== config.markerAttributeName && !isPreservedAttributeName(attributeName);
        });

        const contents = selection.contents();
        const content = select.html(contents);
        if (attributes.length === 0 && !content) {
            selection.removeAttr(config.markerAttributeName);
            continue;
        }

        const encodedPayload = await encrypt(JSON.stringify([attributes, content]), config.aesGcmKey, config.ecdsaPrivateKey, getContext(element.name));

        for (const attributeName of Object.keys(element.attribs)) {
            if (!isPreservedAttributeName(attributeName)) {
                selection.removeAttr(attributeName);
            }
        }

        contents.remove();
        selection.attr(config.payloadAttributeName, encodedPayload);
        hasPayload = true;
    }

    if (hasPayload) {
        select("html").attr(config.pageAttributeName, "");
    }

    return select.html();
}

function isPreservedAttributeName(attributeName: string): boolean {
    const lowerName = attributeName.toLowerCase();
    return (
        LAYOUT_ATTRIBUTE_NAMES.has(lowerName) ||
        STATE_ATTRIBUTE_NAMES.has(lowerName) ||
        lowerName.startsWith("data-astro-cid-") ||
        lowerName === "data-astro-transition" ||
        lowerName.startsWith("data-astro-transition-")
    );
}

export function generateAttributeName(excludedAttributeNames: readonly string[]): string {
    let attributeName: string;
    do {
        attributeName = `data-${generateRandomHex(6)}`;
    } while (excludedAttributeNames.includes(attributeName));

    return attributeName;
}

function getContext(tagName: string): string {
    return `${HTML_NAMESPACE}\0${tagName.toLowerCase()}\0payload`;
}
