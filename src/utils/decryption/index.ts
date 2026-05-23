/**
 * Decryption Module — Public API
 *
 * AES-256-GCM authenticated decryption with PBKDF2-SHA256 key derivation.
 * Uses Node.js built-in `crypto` module — zero third-party dependencies.
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │                    DECRYPTION PIPELINE                       │
 * │                                                              │
 * │   Password ──→ PBKDF2(SHA-256, 150k iter) ──→ AES-256 Key  │
 * │                        ↑                          ↓          │
 * │                    Stored Salt             AES-256-GCM       │
 * │                                          ↑    ↑     ↓        │
 * │                                     Stored  Stored  Plain-   │
 * │                                       IV    AuthTag  text    │
 * │                                                              │
 * │   Input: { cipherText, salt, iv, authTag, version }         │
 * │   Output: plaintext Buffer                                  │
 * └──────────────────────────────────────────────────────────────┘
 *
 * Usage:
 * ```ts
 * import {
 *     decryptBuffer,
 *     decryptFile,
 *     decryptFileStream,
 *     decryptText,
 *     DecryptionError,
 *     DecryptionErrorCode,
 * } from "../decryption";
 *
 * // Decrypt a buffer payload
 * const result = await decryptBuffer(encryptedPayload, { password: "secret" });
 *
 * // Decrypt a file on disk
 * const fileResult = await decryptFile("doc.pdf.enc", "doc.pdf", metadata, { password: "secret" });
 *
 * // Decrypt a large file using streams
 * const fileResult = await decryptFileStream("video.mp4.enc", "video.mp4", metadata, { password: "secret" });
 *
 * // Decrypt a text payload
 * const text = await decryptText(encryptedPayload, "secret");
 *
 * // Error handling
 * try {
 *     await decryptBuffer(payload, { password: "wrong" });
 * } catch (err) {
 *     if (err instanceof DecryptionError) {
 *         switch (err.code) {
 *             case DecryptionErrorCode.WRONG_PASSWORD:
 *                 console.error("Wrong password!");
 *                 break;
 *             case DecryptionErrorCode.INTEGRITY_CHECK_FAILED:
 *                 console.error("Data tampered!");
 *                 break;
 *         }
 *     }
 * }
 * ```
 */

// ─── Core Decryption Functions ───────────────────────────────────────────────
export {
    decryptBuffer,
    decryptBufferRaw,
    decryptFile,
    decryptFileStream,
    decryptText,
} from "./decrypt";

// ─── Key Derivation ──────────────────────────────────────────────────────────
export { deriveKey, deriveKeyAdvanced, deriveKeySync } from "./key";

// ─── Utility Functions ───────────────────────────────────────────────────────
export {
    toBase64,
    fromBase64,
    isValidBase64,
    toHex,
    fromHex,
    normalizeInput,
    validatePayload,
    validatePassword,
    secureWipe,
    timingSafeEqual,
} from "./utils";

// ─── Constants ───────────────────────────────────────────────────────────────
export {
    AES_KEY_LENGTH_BITS,
    AES_KEY_LENGTH_BYTES,
    AES_ALGORITHM,
    GCM_AUTH_TAG_LENGTH_BYTES,
    PBKDF2_ITERATIONS,
    PBKDF2_DIGEST,
    SALT_LENGTH_BYTES,
    IV_LENGTH_BYTES,
    STREAM_CHUNK_SIZE,
    OUTPUT_ENCODING,
    ENCRYPTION_FORMAT_VERSION,
} from "./constants";

// ─── Types ───────────────────────────────────────────────────────────────────
export type {
    EncryptedPayload,
    EncryptedPayloadRaw,
    EncryptionMetadata,
    DecryptBufferOptions,
    DecryptFileOptions,
    DecryptStreamOptions,
    DecryptionResult,
    DecryptFileResult,
    DecryptionInput,
    KeyDerivationParams,
    DerivedKeyResult,
    ProgressCallback,
} from "./types";

// ─── Error Types ─────────────────────────────────────────────────────────────
export { DecryptionError, DecryptionErrorCode } from "./types";
