/**
 * Key Derivation Module
 *
 * Derives cryptographic keys from user passwords using PBKDF2-SHA256.
 * The derived key is used as the AES-256-GCM encryption key.
 *
 * Security notes:
 *  - A unique random salt is generated for every encryption operation.
 *  - The salt must be stored alongside the ciphertext for decryption.
 *  - The password itself is NEVER stored or transmitted.
 *  - PBKDF2 with 150,000 iterations provides strong brute-force resistance.
 */

import crypto from "crypto";
import {
    PBKDF2_ITERATIONS,
    PBKDF2_DIGEST,
    AES_KEY_LENGTH_BYTES,
    SALT_LENGTH_BYTES,
} from "./constants";
import type { DerivedKeyResult, KeyDerivationParams } from "./types";

// ─── Primary Key Derivation ──────────────────────────────────────────────────

/**
 * Derive a 256-bit AES key from a user-supplied password using PBKDF2.
 *
 * @param password  The user's password (plaintext — never stored).
 * @param salt      Optional pre-existing salt. If omitted, a random 16-byte salt is generated.
 * @returns         Promise resolving to `{ key, salt, iterations }`.
 *
 * @example
 * ```ts
 * import { deriveKey } from "./key";
 *
 * const { key, salt } = await deriveKey("my-secret-password");
 * // key: 32-byte Buffer (AES-256 key)
 * // salt: 16-byte Buffer (save with ciphertext for decryption)
 * ```
 */
export async function deriveKey(
    password: string,
    salt?: Buffer,
): Promise<DerivedKeyResult> {
    if (!password || password.length === 0) {
        throw new Error("Password must not be empty.");
    }

    // Generate a cryptographically secure random salt if not provided
    const usedSalt: Buffer =
        salt ?? crypto.randomBytes(SALT_LENGTH_BYTES);

    const derivedKey: Buffer = await new Promise<Buffer>(
        (resolve, reject) => {
            crypto.pbkdf2(
                password,
                usedSalt,
                PBKDF2_ITERATIONS,
                AES_KEY_LENGTH_BYTES,
                PBKDF2_DIGEST,
                (err, key) => {
                    if (err) reject(err);
                    else resolve(key);
                },
            );
        },
    );

    return {
        key: derivedKey,
        salt: usedSalt,
        iterations: PBKDF2_ITERATIONS,
    };
}

// ─── Advanced Key Derivation ─────────────────────────────────────────────────

/**
 * Derive a key with fully custom parameters.
 * Useful for testing or when migrating from a different iteration count.
 *
 * @param params  Full set of key derivation parameters.
 * @returns       The derived key as a Buffer.
 */
export async function deriveKeyAdvanced(
    params: KeyDerivationParams,
): Promise<Buffer> {
    const { password, salt, iterations, keyLength, digest } = params;

    if (!password || password.length === 0) {
        throw new Error("Password must not be empty.");
    }

    if (iterations < 1) {
        throw new Error("Iterations must be at least 1.");
    }

    if (keyLength < 1) {
        throw new Error("Key length must be at least 1 byte.");
    }

    return new Promise<Buffer>((resolve, reject) => {
        crypto.pbkdf2(
            password,
            salt,
            iterations,
            keyLength,
            digest,
            (err, key) => {
                if (err) reject(err);
                else resolve(key);
            },
        );
    });
}

// ─── Synchronous Key Derivation (blocking — use sparingly) ───────────────────

/**
 * Synchronous version of `deriveKey`. Blocks the event loop.
 * Only use when async is not an option (e.g. CLI scripts, init code).
 *
 * @param password  The user's password.
 * @param salt      Optional salt. If omitted, a random one is generated.
 * @returns         `{ key, salt, iterations }`.
 */
export function deriveKeySync(
    password: string,
    salt?: Buffer,
): DerivedKeyResult {
    if (!password || password.length === 0) {
        throw new Error("Password must not be empty.");
    }

    const usedSalt: Buffer =
        salt ?? crypto.randomBytes(SALT_LENGTH_BYTES);

    const derivedKey: Buffer = crypto.pbkdf2Sync(
        password,
        usedSalt,
        PBKDF2_ITERATIONS,
        AES_KEY_LENGTH_BYTES,
        PBKDF2_DIGEST,
    );

    return {
        key: derivedKey,
        salt: usedSalt,
        iterations: PBKDF2_ITERATIONS,
    };
}

// ─── Salt Generation ─────────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure random salt.
 *
 * @param length  Salt length in bytes (default: 16).
 * @returns       Random salt Buffer.
 */
export function generateSalt(length: number = SALT_LENGTH_BYTES): Buffer {
    return crypto.randomBytes(length);
}
