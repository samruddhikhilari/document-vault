/**
 * Key Derivation Module (Decryption)
 *
 * Re-derives the AES-256 key from the user's password and the saved salt.
 * Uses the same PBKDF2-SHA256 parameters as the encryption module.
 *
 * The salt is NOT secret — it was stored alongside the ciphertext.
 * Only the password is secret and must be supplied by the user.
 */

import crypto from "crypto";
import {
    PBKDF2_ITERATIONS,
    PBKDF2_DIGEST,
    AES_KEY_LENGTH_BYTES,
} from "./constants";
import type { DerivedKeyResult, KeyDerivationParams } from "./types";

// ─── Primary Key Derivation ──────────────────────────────────────────────────

/**
 * Re-derive the AES-256 key from a password and the original salt.
 *
 * This produces the exact same key that was used during encryption,
 * provided the password and salt are identical.
 *
 * @param password  The user's password (same one used during encryption).
 * @param salt      The salt that was stored with the ciphertext.
 * @returns         Promise resolving to `{ key, salt, iterations }`.
 *
 * @example
 * ```ts
 * import { deriveKey } from "./key";
 *
 * const { key } = await deriveKey("my-secret-password", savedSalt);
 * // key: 32-byte Buffer — same key that was used for encryption
 * ```
 */
export async function deriveKey(
    password: string,
    salt: Buffer,
): Promise<DerivedKeyResult> {
    if (!password || password.length === 0) {
        throw new Error("Password must not be empty.");
    }

    if (!Buffer.isBuffer(salt) || salt.length === 0) {
        throw new Error("Salt must be a non-empty Buffer.");
    }

    const derivedKey: Buffer = await new Promise<Buffer>(
        (resolve, reject) => {
            crypto.pbkdf2(
                password,
                salt,
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
        salt,
        iterations: PBKDF2_ITERATIONS,
    };
}

// ─── Advanced Key Derivation ─────────────────────────────────────────────────

/**
 * Derive a key with fully custom parameters.
 * Useful when decrypting data that was encrypted with non-default settings.
 *
 * @param params  Full key derivation parameters.
 * @returns       The derived key as a Buffer.
 */
export async function deriveKeyAdvanced(
    params: KeyDerivationParams,
): Promise<Buffer> {
    const { password, salt, iterations, keyLength, digest } = params;

    if (!password || password.length === 0) {
        throw new Error("Password must not be empty.");
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

// ─── Synchronous Key Derivation ──────────────────────────────────────────────

/**
 * Synchronous version of `deriveKey`. Blocks the event loop.
 *
 * @param password  The user's password.
 * @param salt      The stored salt.
 * @returns         `{ key, salt, iterations }`.
 */
export function deriveKeySync(
    password: string,
    salt: Buffer,
): DerivedKeyResult {
    if (!password || password.length === 0) {
        throw new Error("Password must not be empty.");
    }

    if (!Buffer.isBuffer(salt) || salt.length === 0) {
        throw new Error("Salt must be a non-empty Buffer.");
    }

    const derivedKey: Buffer = crypto.pbkdf2Sync(
        password,
        salt,
        PBKDF2_ITERATIONS,
        AES_KEY_LENGTH_BYTES,
        PBKDF2_DIGEST,
    );

    return {
        key: derivedKey,
        salt,
        iterations: PBKDF2_ITERATIONS,
    };
}
