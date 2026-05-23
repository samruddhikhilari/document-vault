/**
 * Encryption Module — Public API
 *
 * AES-256-GCM authenticated encryption with PBKDF2-SHA256 key derivation.
 * Uses Node.js built-in `crypto` module — zero third-party dependencies.
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │                    ENCRYPTION PIPELINE                       │
 * │                                                              │
 * │   Password ──→ PBKDF2(SHA-256, 150k iter) ──→ AES-256 Key  │
 * │                        ↑                          ↓          │
 * │                    Random Salt              AES-256-GCM      │
 * │                                          ↑          ↓        │
 * │                                      Random IV   Ciphertext  │
 * │                                                  + Auth Tag  │
 * │                                                              │
 * │   Output: { cipherText, salt, iv, authTag, version }        │
 * └──────────────────────────────────────────────────────────────┘
 *
 * Usage:
 * ```ts
 * import {
 *     encryptBuffer,
 *     encryptFile,
 *     encryptFileStream,
 *     encryptText,
 * } from "../encryption";
 *
 * // Encrypt a buffer
 * const payload = await encryptBuffer(fileData, { password: "secret" });
 *
 * // Encrypt a file on disk
 * const metadata = await encryptFile("doc.pdf", "doc.pdf.enc", { password: "secret" });
 *
 * // Encrypt a large file using streams (constant memory)
 * const metadata = await encryptFileStream("video.mp4", "video.mp4.enc", { password: "secret" });
 *
 * // Encrypt a text string
 * const payload = await encryptText("my secret note", "secret");
 * ```
 */

// ─── Core Encryption Functions ───────────────────────────────────────────────
export {
    encryptBuffer,
    encryptBufferRaw,
    encryptFile,
    encryptFileStream,
    encryptText,
} from "./encrypt";

// ─── Key Derivation ──────────────────────────────────────────────────────────
export { deriveKey, deriveKeyAdvanced, deriveKeySync, generateSalt } from "./key";

// ─── Utility Functions ───────────────────────────────────────────────────────
export {
    toBase64,
    fromBase64,
    isValidBase64,
    toHex,
    fromHex,
    generateIV,
    generateRandomId,
    normalizeInput,
    validatePassword,
    validateSalt,
    validateIV,
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
    EncryptBufferOptions,
    EncryptFileOptions,
    EncryptStreamOptions,
    EncryptStreamResult,
    EncryptionInput,
    KeyDerivationParams,
    DerivedKeyResult,
    ProgressCallback,
} from "./types";
