/**
 * astro-mail-obfuscation - SERVER
 *
 * Copyright (c) 2024-2026 Andreas Brunner
 * SPDX-License-Identifier: MIT
 */

const AES_GCM_IV_LENGTH_BYTES = 12;

const TEXT_ENCODER = new TextEncoder();

export function generateRandomHex(byteLength: number): string {
    const bytes = new Uint8Array(byteLength);
    globalThis.crypto.getRandomValues(bytes);

    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function encrypt(plaintext: string, aesGcmKey: CryptoKey, ecdsaPrivateKey: CryptoKey, context: string): Promise<string> {
    const iv = new Uint8Array(AES_GCM_IV_LENGTH_BYTES);
    globalThis.crypto.getRandomValues(iv);

    const ciphertext = new Uint8Array(
        await globalThis.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv,
                additionalData: TEXT_ENCODER.encode(context),
            },
            aesGcmKey,
            TEXT_ENCODER.encode(plaintext)
        )
    );

    const encryptedPayload = new Uint8Array(iv.length + ciphertext.length);
    encryptedPayload.set(iv, 0);
    encryptedPayload.set(ciphertext, iv.length);

    const signature = new Uint8Array(await globalThis.crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, ecdsaPrivateKey, encryptedPayload));

    // signature || iv || ciphertext || tag
    const signedPayload = new Uint8Array(signature.length + encryptedPayload.length);
    signedPayload.set(signature, 0);
    signedPayload.set(encryptedPayload, signature.length);

    return encodeBase64(signedPayload);
}

export function encodeBase64(bytes: Uint8Array): string {
    const chunkByteLength = 8192;
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += chunkByteLength) {
        const chunk = bytes.subarray(offset, offset + chunkByteLength);
        binary += String.fromCodePoint(...chunk);
    }

    return btoa(binary);
}

export function decodeBase64(base64: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(atob(base64), (character) => character.codePointAt(0) ?? 0);
}
