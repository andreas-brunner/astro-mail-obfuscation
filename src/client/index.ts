/**
 * astro-mail-obfuscation - CLIENT
 *
 * Copyright (c) 2024-2026 Andreas Brunner
 * SPDX-License-Identifier: MIT
 *
 * Intended behavior: silent errors.
 */

/// <reference types="astro/client" />

import type { TransitionBeforePreparationEvent } from "astro:transitions/client";

import { deobfuscateDocument } from "./deobfuscation.js";

let deobfuscationQueuePromise = Promise.resolve();

async function tryDeobfuscateDocument(documentRoot: Document): Promise<void> {
    try {
        await deobfuscateDocument(documentRoot);
    } catch {}
}

function enqueue(operation: () => Promise<void>): Promise<void> {
    deobfuscationQueuePromise = deobfuscationQueuePromise.then(operation, operation);

    return deobfuscationQueuePromise;
}

function enqueueDocumentDeobfuscation(documentRoot: Document): Promise<void> {
    return enqueue(() => tryDeobfuscateDocument(documentRoot));
}

function handleBeforePreparation(event: TransitionBeforePreparationEvent): void {
    const originalLoader = event.loader;

    event.loader = async () => {
        await originalLoader();
        await enqueueDocumentDeobfuscation(event.newDocument);
    };
}

document.addEventListener("astro:before-preparation", handleBeforePreparation);

await enqueueDocumentDeobfuscation(document);
