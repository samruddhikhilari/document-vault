/**
 * Encryption Type Definitions
 *
 * Shared interfaces and types for the encryption module.
 * These types define the contract between encryption and decryption modules.
 */

import { Readable } from "stream";

// ─── Core Payload Types ──────────────────────────────────────────────────────

/**
 * The output of an encryption operation.
 * Contains everything needed to decrypt the data later (except the password).
 */
export interface EncryptedPayload {
    /** Base-64 encoded ciphertext (AES-GCM output including auth tag appended) */
    cipherText: string;

    /** Base-64 encoded 16-byte salt used for PBKDF2 key derivation */
    salt: string;

    /** Base-64 encoded 12-byte IV used for AES-GCM */
    iv: string;

    /** Base-64 encoded 16-byte GCM authentication tag */
    authTag: string;

    /** Encryption format version for forward compatibility */
    version: number;
}

/**
 * Raw (binary) form of the encrypted payload — useful when you
 * want to avoid base-64 encoding overhead (e.g. streaming to GridFS).
 */
export interface EncryptedPayloadRaw {
    /** Raw encrypted bytes (does NOT include the auth tag) */
    cipherBytes: Buffer;

    /** 16-byte random salt */
    salt: Buffer;

    /** 12-byte random IV */
    iv: Buffer;

    /** 16-byte GCM authentication tag */
    authTag: Buffer;

    /** Encryption format version */
    version: number;
}

// ─── Metadata Types ──────────────────────────────────────────────────────────

/**
 * Metadata stored alongside an encrypted file in the database.
 * Contains non-secret parameters needed for decryption.
 */
export interface EncryptionMetadata {
    /** Base-64 encoded salt */
    salt: string;

    /** Base-64 encoded IV */
    iv: string;

    /** Base-64 encoded GCM auth tag */
    authTag: string;

    /** Original file name before encryption */
    originalFileName: string;

    /** Original MIME type of the file */
    mimeType: string;

    /** Original file size in bytes (before encryption) */
    originalSize: number;

    /** Encryption format version */
    version: number;

    /** ISO timestamp of when encryption was performed */
    encryptedAt: string;
}

// ─── Key Derivation Types ────────────────────────────────────────────────────

/**
 * Parameters for PBKDF2 key derivation.
 */
export interface KeyDerivationParams {
    /** User-supplied password (never stored) */
    password: string;

    /** Random salt bytes */
    salt: Buffer;

    /** Number of PBKDF2 iterations */
    iterations: number;

    /** Key length in bytes */
    keyLength: number;

    /** Hash digest algorithm */
    digest: string;
}

/**
 * Result of key derivation — the derived key plus the params used.
 */
export interface DerivedKeyResult {
    /** The derived encryption key */
    key: Buffer;

    /** The salt that was used (save for decryption) */
    salt: Buffer;

    /** Number of iterations used */
    iterations: number;
}

// ─── Options Types ───────────────────────────────────────────────────────────

/**
 * Options for the `encryptFile` function.
 */
export interface EncryptFileOptions {
    /** User-supplied password for key derivation */
    password: string;

    /** Optional: pre-generated salt (if omitted, a random one is created) */
    salt?: Buffer;

    /** Optional: pre-generated IV (if omitted, a random one is created) */
    iv?: Buffer;
}

/**
 * Options for the `encryptBuffer` function.
 */
export interface EncryptBufferOptions {
    /** User-supplied password for key derivation */
    password: string;

    /** Optional: pre-generated salt */
    salt?: Buffer;

    /** Optional: pre-generated IV */
    iv?: Buffer;
}

/**
 * Options for stream-based encryption.
 */
export interface EncryptStreamOptions {
    /** User-supplied password for key derivation */
    password: string;

    /** Chunk size in bytes for stream processing */
    chunkSize?: number;
}

/**
 * Result of stream encryption setup — provides the writable stream
 * and a promise that resolves with metadata when encryption completes.
 */
export interface EncryptStreamResult {
    /** The encrypted output stream to pipe/read from */
    encryptedStream: Readable;

    /** Salt used (save for decryption) */
    salt: Buffer;

    /** IV used (save for decryption) */
    iv: Buffer;

    /** Promise that resolves with the auth tag after encryption completes */
    authTagPromise: Promise<Buffer>;
}

// ─── Utility Types ───────────────────────────────────────────────────────────

/**
 * Supported input types for encryption.
 */
export type EncryptionInput = Buffer | ArrayBuffer | Uint8Array | string;

/**
 * Callback for progress reporting during large file operations.
 * @param bytesProcessed  Number of bytes processed so far.
 * @param totalBytes      Total number of bytes (if known).
 */
export type ProgressCallback = (
    bytesProcessed: number,
    totalBytes?: number,
) => void;
