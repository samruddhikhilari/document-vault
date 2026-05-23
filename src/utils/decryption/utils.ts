/**
 * Decryption Utility Functions
 *
 * Helper functions for encoding, decoding, validation, and secure memory
 * operations used throughout the decryption module.
 */

import crypto from "crypto";
import {
    IV_LENGTH_BYTES,
    SALT_LENGTH_BYTES,
    GCM_AUTH_TAG_LENGTH_BYTES,
    ENCRYPTION_FORMAT_VERSION,
} from "./constants";
import type { EncryptedPayload, DecryptionInput } from "./types";
import { DecryptionError, DecryptionErrorCode } from "./types";

// ─── Base-64 Encoding / Decoding ─────────────────────────────────────────────

/**
 * Encode a Buffer or Uint8Array to a standard base-64 string.
 */
export function toBase64(data: Buffer | Uint8Array): string {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    return buf.toString("base64");
}

/**
 * Decode a base-64 string back to a Buffer.
 */
export function fromBase64(base64: string): Buffer {
    return Buffer.from(base64, "base64");
}

/**
 * Validate that a string is valid base-64.
 */
export function isValidBase64(str: string): boolean {
    if (!str || str.length === 0) return false;
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(str) && str.length % 4 === 0;
}

// ─── Hex Encoding / Decoding ─────────────────────────────────────────────────

/**
 * Encode a Buffer to a hex string.
 */
export function toHex(data: Buffer | Uint8Array): string {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    return buf.toString("hex");
}

/**
 * Decode a hex string to a Buffer.
 */
export function fromHex(hex: string): Buffer {
    return Buffer.from(hex, "hex");
}

// ─── Input Normalization ─────────────────────────────────────────────────────

/**
 * Normalize any supported input type to a Buffer.
 */
export function normalizeInput(input: DecryptionInput): Buffer {
    if (Buffer.isBuffer(input)) {
        return input;
    }
    if (input instanceof ArrayBuffer) {
        return Buffer.from(input);
    }
    if (input instanceof Uint8Array) {
        return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
    }
    throw new TypeError(
        `Unsupported input type: ${typeof input}. Expected Buffer, ArrayBuffer, or Uint8Array.`,
    );
}

// ─── Payload Validation ──────────────────────────────────────────────────────

/**
 * Validate an `EncryptedPayload` has all required fields and correct formats.
 *
 * @param payload  The payload to validate.
 * @throws         `DecryptionError` if the payload is invalid.
 */
export function validatePayload(payload: EncryptedPayload): void {
    // Check required fields exist
    const requiredFields: (keyof EncryptedPayload)[] = [
        "cipherText",
        "salt",
        "iv",
        "authTag",
        "version",
    ];

    for (const field of requiredFields) {
        if (payload[field] === undefined || payload[field] === null) {
            throw new DecryptionError(
                `Missing required field: ${field}`,
                DecryptionErrorCode.MISSING_FIELDS,
            );
        }
    }

    // Validate base-64 encoding (cipherText may be empty for empty plaintext)
    if (payload.cipherText.length > 0 && !isValidBase64(payload.cipherText)) {
        throw new DecryptionError(
            "cipherText is not valid base-64",
            DecryptionErrorCode.INVALID_FORMAT,
        );
    }
    if (!isValidBase64(payload.salt)) {
        throw new DecryptionError(
            "salt is not valid base-64",
            DecryptionErrorCode.INVALID_FORMAT,
        );
    }
    if (!isValidBase64(payload.iv)) {
        throw new DecryptionError(
            "iv is not valid base-64",
            DecryptionErrorCode.INVALID_FORMAT,
        );
    }
    if (!isValidBase64(payload.authTag)) {
        throw new DecryptionError(
            "authTag is not valid base-64",
            DecryptionErrorCode.INVALID_FORMAT,
        );
    }

    // Validate decoded lengths
    const saltBytes = fromBase64(payload.salt);
    if (saltBytes.length !== SALT_LENGTH_BYTES) {
        throw new DecryptionError(
            `Salt must be ${SALT_LENGTH_BYTES} bytes, got ${saltBytes.length}`,
            DecryptionErrorCode.INVALID_FORMAT,
        );
    }

    const ivBytes = fromBase64(payload.iv);
    if (ivBytes.length !== IV_LENGTH_BYTES) {
        throw new DecryptionError(
            `IV must be ${IV_LENGTH_BYTES} bytes, got ${ivBytes.length}`,
            DecryptionErrorCode.INVALID_FORMAT,
        );
    }

    const authTagBytes = fromBase64(payload.authTag);
    if (authTagBytes.length !== GCM_AUTH_TAG_LENGTH_BYTES) {
        throw new DecryptionError(
            `Auth tag must be ${GCM_AUTH_TAG_LENGTH_BYTES} bytes, got ${authTagBytes.length}`,
            DecryptionErrorCode.INVALID_FORMAT,
        );
    }

    // Validate version
    if (payload.version !== ENCRYPTION_FORMAT_VERSION) {
        throw new DecryptionError(
            `Unsupported encryption version: ${payload.version} (expected ${ENCRYPTION_FORMAT_VERSION})`,
            DecryptionErrorCode.UNSUPPORTED_VERSION,
        );
    }
}

/**
 * Validate that a password is provided and non-empty.
 */
export function validatePassword(password: string): void {
    if (!password || typeof password !== "string") {
        throw new DecryptionError(
            "Password must be a non-empty string.",
            DecryptionErrorCode.MISSING_FIELDS,
        );
    }
}

// ─── Secure Memory Helpers ───────────────────────────────────────────────────

/**
 * Securely wipe a Buffer by filling it with zeros.
 */
export function secureWipe(buffer: Buffer): void {
    if (Buffer.isBuffer(buffer)) {
        buffer.fill(0);
    }
}

/**
 * Timing-safe comparison of two buffers.
 * Prevents timing attack side-channels.
 */
export function timingSafeEqual(a: Buffer, b: Buffer): boolean {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}
