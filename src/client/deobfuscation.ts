/**
 * astro-mail-obfuscation - CLIENT
 *
 * Copyright (c) 2024-2026 Andreas Brunner
 * SPDX-License-Identifier: MIT
 *
 * Intended behavior: silent errors.
 */

import { decrypt } from "./crypto.js";

declare const ASTRO_MAIL_OBFUSCATION_PAGE_ATTRIBUTE_NAME: string;
declare const ASTRO_MAIL_OBFUSCATION_PAYLOAD_ATTRIBUTE_NAME: string;
declare const ASTRO_MAIL_OBFUSCATION_TRUSTED_TYPES_POLICY_NAME: string;

type AttributeEntry = [attributeName: string, attributeValue: string];
type ElementPayload = [attributes: AttributeEntry[], content: string];

interface TrustedTypesPolicy {
    createHTML: (input: string) => string; // pass-through
}

interface TrustedTypesFactory {
    createPolicy: (name: string, rules: { createHTML: (input: string) => string }) => TrustedTypesPolicy;
}

const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
const TRUSTED_TYPES_POLICY = createTrustedTypesPolicy();

export async function deobfuscateDocument(documentRoot: Document): Promise<void> {
    if (!documentRoot.documentElement.hasAttribute(ASTRO_MAIL_OBFUSCATION_PAGE_ATTRIBUTE_NAME)) {
        return;
    }

    for (const element of documentRoot.querySelectorAll(`[${ASTRO_MAIL_OBFUSCATION_PAYLOAD_ATTRIBUTE_NAME}]`)) {
        await deobfuscateElement(element);
    }
}

async function deobfuscateElement(element: Element): Promise<void> {
    if (element.namespaceURI !== HTML_NAMESPACE) {
        return;
    }

    const encodedPayload = element.getAttribute(ASTRO_MAIL_OBFUSCATION_PAYLOAD_ATTRIBUTE_NAME);
    if (encodedPayload === null) {
        return;
    }

    try {
        const payloadJson = await decrypt(encodedPayload, getContext(element.localName));

        restoreElement(element, ...parseElementPayload(payloadJson));
    } catch {}
}

function parseElementPayload(payloadJson: string): ElementPayload {
    const elementPayload: unknown = JSON.parse(payloadJson);
    if (!isElementPayload(elementPayload)) {
        throw new Error(); // NOSONAR
    }

    return elementPayload;
}

function isElementPayload(value: unknown): value is ElementPayload {
    return Array.isArray(value) && value.length === 2 && Array.isArray(value[0]) && value[0].every(isAttributeEntry) && typeof value[1] === "string";
}

function isAttributeEntry(value: unknown): value is AttributeEntry {
    return Array.isArray(value) && value.length === 2 && typeof value[0] === "string" && value[0].length > 0 && typeof value[1] === "string";
}

function restoreElement(element: Element, attributes: AttributeEntry[], content: string): void {
    for (const [attributeName, attributeValue] of attributes) {
        element.setAttribute(attributeName, attributeValue);
    }

    element.innerHTML = TRUSTED_TYPES_POLICY?.createHTML(content) ?? content;
    element.removeAttribute(ASTRO_MAIL_OBFUSCATION_PAYLOAD_ATTRIBUTE_NAME);
}

function createTrustedTypesPolicy(): TrustedTypesPolicy | undefined {
    const trustedTypes = (globalThis as typeof globalThis & { trustedTypes?: TrustedTypesFactory }).trustedTypes;
    if (trustedTypes === undefined) {
        return undefined;
    }

    try {
        return trustedTypes.createPolicy(ASTRO_MAIL_OBFUSCATION_TRUSTED_TYPES_POLICY_NAME, {
            createHTML: (input) => input,
        });
    } catch {
        return undefined;
    }
}

function getContext(tagName: string): string {
    return `${HTML_NAMESPACE}\0${tagName.toLowerCase()}\0payload`;
}
