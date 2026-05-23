/**
 * Encryption Utility Functions
 *
 * Helper functions for encoding, random generation, and input normalization
 * used throughout the encryption module.
 */

import crypto from "crypto";
import { IV_LENGTH_BYTES, SALT_LENGTH_BYTES } from "./constants";
import type { EncryptionInput } from "./types";

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
    if (str.length === 0) return false;
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

// ─── Random Value Generation ─────────────────────────────────────────────────

/**
 * Generate a cryptographically secure random Initialization Vector (IV).
 * Default length: 12 bytes (96-bit) as recommended by NIST for AES-GCM.
 */
export function generateIV(length: number = IV_LENGTH_BYTES): Buffer {
    return crypto.randomBytes(length);
}

/**
 * Generate a cryptographically secure random salt.
 * Default length: 16 bytes (128-bit).
 */
export function generateSalt(length: number = SALT_LENGTH_BYTES): Buffer {
    return crypto.randomBytes(length);
}

/**
 * Generate a random string of specified length using URL-safe base-64.
 * Useful for generating file IDs, tokens, etc.
 */
export function generateRandomId(byteLength: number = 16): string {
    return crypto.randomBytes(byteLength).toString("base64url");
}

// ─── Input Normalization ─────────────────────────────────────────────────────

/**
 * Normalize any supported input type to a Buffer.
 *
 * Supported input types:
 *  - Buffer: returned as-is
 *  - ArrayBuffer: wrapped in Buffer
 *  - Uint8Array: wrapped in Buffer
 *  - string: encoded as UTF-8 Buffer
 *
 * @param input  The data to normalize.
 * @returns      A Node.js Buffer.
 */
export function normalizeInput(input: EncryptionInput): Buffer {
    if (Buffer.isBuffer(input)) {
        return input;
    }
    if (input instanceof ArrayBuffer) {
        return Buffer.from(input);
    }
    if (input instanceof Uint8Array) {
        return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
    }
    if (typeof input === "string") {
        return Buffer.from(input, "utf-8");
    }
    throw new TypeError(
        `Unsupported input type: ${typeof input}. Expected Buffer, ArrayBuffer, Uint8Array, or string.`,
    );
}

// ─── Validation Helpers ──────────────────────────────────────────────────────

/**
 * Validate that a password meets minimum security requirements.
 *
 * @param password  The password to validate.
 * @throws          Error if the password is too weak.
 */
export function validatePassword(password: string): void {
    if (!password || typeof password !== "string") {
        throw new Error("Password must be a non-empty string.");
    }
    if (password.length < 8) {
        throw new Error(
            "Password must be at least 8 characters long for adequate security.",
        );
    }
}

/**
 * Validate that a salt has the expected length.
 */
export function validateSalt(
    salt: Buffer,
    expectedLength: number = SALT_LENGTH_BYTES,
): void {
    if (!Buffer.isBuffer(salt)) {
        throw new TypeError("Salt must be a Buffer.");
    }
    if (salt.length !== expectedLength) {
        throw new Error(
            `Salt must be exactly ${expectedLength} bytes, got ${salt.length}.`,
        );
    }
}

/**
 * Validate that an IV has the expected length.
 */
export function validateIV(
    iv: Buffer,
    expectedLength: number = IV_LENGTH_BYTES,
): void {
    if (!Buffer.isBuffer(iv)) {
        throw new TypeError("IV must be a Buffer.");
    }
    if (iv.length !== expectedLength) {
        throw new Error(
            `IV must be exactly ${expectedLength} bytes, got ${iv.length}.`,
        );
    }
}

// ─── Secure Memory Helpers ───────────────────────────────────────────────────

/**
 * Securely wipe a Buffer by filling it with zeros.
 * Use this to clear sensitive data (keys, passwords) from memory
 * when they are no longer needed.
 *
 * @param buffer  The Buffer to wipe.
 */
export function secureWipe(buffer: Buffer): void {
    if (Buffer.isBuffer(buffer)) {
        buffer.fill(0);
    }
}

/**
 * Create a timing-safe comparison of two buffers.
 * Prevents timing attack side-channels when comparing auth tags, hashes, etc.
 */
export function timingSafeEqual(a: Buffer, b: Buffer): boolean {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}
