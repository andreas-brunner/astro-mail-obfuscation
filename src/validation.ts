/**
 * astro-mail-obfuscation - SERVER
 *
 * Copyright (c) 2024-2026 Andreas Brunner
 * SPDX-License-Identifier: MIT
 */

import { isTag, type Element } from "domhandler";

import type { CheerioModule } from "./obfuscation.js";

type CheerioSelection = ReturnType<ReturnType<CheerioModule["load"]>>;

export const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";

const UNSUPPORTED_TAG_NAMES = new Set(["body", "frameset", "head", "html", "plaintext"]);

export function selectAndValidateObfuscationTargets(
    html: string,
    select: ReturnType<CheerioModule["load"]>,
    cheerio: CheerioModule,
    markerAttributeName: string
): CheerioSelection {
    const errors = new Set<string>();
    const targets = select(`[${markerAttributeName}]`);

    if (cheerio.load(html, { scriptingEnabled: false })(`noscript [${markerAttributeName}]`).length > 0) {
        errors.add(`${markerAttributeName} is not allowed inside <noscript>.`);
    }

    function checkAncestors(element: Element): void {
        let ancestor = element.parent;

        while (ancestor) {
            if (isTag(ancestor)) {
                const tagName = ancestor.name.toLowerCase();

                if (markerAttributeName in (ancestor.attribs ?? {})) {
                    errors.add(`Nested ${markerAttributeName} markers are not supported; mark only the outermost element.`);
                }
                if (tagName === "astro-island") {
                    errors.add(`${markerAttributeName} is not allowed inside hydrated <astro-island>.`);
                }
                if (tagName === "template") {
                    errors.add(`${markerAttributeName} is not allowed inside <template>.`);
                }
            }

            ancestor = ancestor.parent;
        }
    }

    function checkElement(element: Element, isRoot: boolean): void {
        const tagName = element.name.toLowerCase();
        const namespace = element.namespace ?? HTML_NAMESPACE;

        if (isRoot && namespace !== HTML_NAMESPACE) {
            errors.add(`${markerAttributeName} is only allowed on HTML elements.`);
            return;
        }
        if (namespace !== HTML_NAMESPACE) {
            return;
        }
        if (tagName === "script") {
            errors.add("<script> is not allowed in obfuscated content.");
            return;
        }
        if (tagName === "template") {
            errors.add("<template> is not allowed in obfuscated content.");
            return;
        }
        if (tagName === "noscript") {
            errors.add("<noscript> is not allowed in obfuscated content; place it outside the obfuscated element.");
            return;
        }
        if (tagName === "astro-island") {
            errors.add("Hydrated <astro-island> is not allowed in obfuscated content.");
        }
        if (isRoot && tagName.includes("-")) {
            errors.add(`Custom element <${tagName}> cannot be the root; it may upgrade before restoration.`);
        }
        if (isRoot && UNSUPPORTED_TAG_NAMES.has(tagName)) {
            errors.add(`<${tagName}> is not supported as an obfuscated root.`);
        }
        if (isRoot && "is" in (element.attribs ?? {})) {
            errors.add("Elements with the is attribute cannot be obfuscated roots.");
        }
    }

    function checkContent(root: Element): void {
        const stack: Element[] = [root];

        while (stack.length > 0) {
            const element = stack.pop();
            if (element === undefined) {
                break;
            }

            const isRoot = element === root;
            checkElement(element, isRoot);

            if (element.children) {
                for (const child of element.children) {
                    if (isTag(child)) {
                        stack.push(child);
                    }
                }
            }
        }
    }

    for (const element of targets.toArray()) {
        if (!isTag(element)) {
            continue;
        }

        checkAncestors(element);
        checkContent(element);
    }

    if (errors.size > 0) {
        throw new Error(`Invalid ${markerAttributeName} usage:\n- ${[...errors].join("\n- ")}`);
    }

    return targets;
}
