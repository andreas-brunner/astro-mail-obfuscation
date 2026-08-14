/**
 * astro-mail-obfuscation - CLIENT
 *
 * Copyright (c) 2024-2026 Andreas Brunner
 * SPDX-License-Identifier: MIT
 *
 * Intended behavior: silent errors.
 */

declare const ASTRO_MAIL_OBFUSCATION_ECDSA_PUBLIC_KEY_BASE64: string;
declare const ASTRO_MAIL_OBFUSCATION_AES_GCM_KEY_BASE64: string;

const ECDSA_SIGNATURE_LENGTH_BYTES = 64;

const AES_GCM_IV_LENGTH_BYTES = 12;
const AES_GCM_TAG_LENGTH_BYTES = 16;

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

let ecdsaPublicKeyPromise: Promise<CryptoKey> | undefined;
let aesGcmKeyPromise: Promise<CryptoKey> | undefined;

export async function decrypt(encodedPayload: string, context: string): Promise<string> {
    const signedPayload = decodeBase64(encodedPayload);
    if (signedPayload.byteLength < ECDSA_SIGNATURE_LENGTH_BYTES + AES_GCM_IV_LENGTH_BYTES + AES_GCM_TAG_LENGTH_BYTES) {
        throw new Error(); // NOSONAR
    }

    // signature || iv || ciphertext || tag
    const signature = signedPayload.subarray(0, ECDSA_SIGNATURE_LENGTH_BYTES);
    const encryptedPayload = signedPayload.subarray(ECDSA_SIGNATURE_LENGTH_BYTES);

    ecdsaPublicKeyPromise ??= globalThis.crypto.subtle.importKey(
        "spki",
        decodeBase64(ASTRO_MAIL_OBFUSCATION_ECDSA_PUBLIC_KEY_BASE64),
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["verify"]
    );

    const ecdsaPublicKey = await ecdsaPublicKeyPromise;
    const isSignatureValid = await globalThis.crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, ecdsaPublicKey, signature, encryptedPayload);
    if (!isSignatureValid) {
        throw new Error(); // NOSONAR
    }

    const iv = encryptedPayload.subarray(0, AES_GCM_IV_LENGTH_BYTES);
    const ciphertext = encryptedPayload.subarray(AES_GCM_IV_LENGTH_BYTES);

    aesGcmKeyPromise ??= globalThis.crypto.subtle.importKey("raw", decodeBase64(ASTRO_MAIL_OBFUSCATION_AES_GCM_KEY_BASE64), { name: "AES-GCM" }, false, [
        "decrypt",
    ]);

    const aesGcmKey = await aesGcmKeyPromise;
    const plaintext = await globalThis.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv,
            additionalData: TEXT_ENCODER.encode(context),
        },
        aesGcmKey,
        ciphertext
    );

    return TEXT_DECODER.decode(plaintext);
}

function decodeBase64(base64: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(atob(base64), (character) => character.codePointAt(0) ?? 0);
}
