/**
 * Decryption Type Definitions
 *
 * Shared interfaces and types for the decryption module.
 * These types mirror the encryption module's types for compatibility.
 */

// ─── Core Payload Types ──────────────────────────────────────────────────────

/**
 * The encrypted payload to be decrypted.
 * Must match the output of the encryption module's `EncryptedPayload`.
 */
export interface EncryptedPayload {
    /** Base-64 encoded ciphertext */
    cipherText: string;

    /** Base-64 encoded salt used for PBKDF2 key derivation */
    salt: string;

    /** Base-64 encoded IV used for AES-GCM */
    iv: string;

    /** Base-64 encoded GCM authentication tag */
    authTag: string;

    /** Encryption format version */
    version: number;
}

/**
 * Raw (binary) form of the encrypted payload.
 */
export interface EncryptedPayloadRaw {
    /** Raw encrypted bytes */
    cipherBytes: Buffer;

    /** 16-byte salt */
    salt: Buffer;

    /** 12-byte IV */
    iv: Buffer;

    /** 16-byte GCM authentication tag */
    authTag: Buffer;

    /** Encryption format version */
    version: number;
}

// ─── Metadata Types ──────────────────────────────────────────────────────────

/**
 * Metadata stored alongside an encrypted file.
 * Used to reconstruct decryption parameters.
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
    /** User-supplied password */
    password: string;

    /** Salt bytes (from the encrypted payload) */
    salt: Buffer;

    /** Number of PBKDF2 iterations */
    iterations: number;

    /** Key length in bytes */
    keyLength: number;

    /** Hash digest algorithm */
    digest: string;
}

/**
 * Result of key derivation.
 */
export interface DerivedKeyResult {
    /** The derived decryption key */
    key: Buffer;

    /** The salt that was used */
    salt: Buffer;

    /** Number of iterations used */
    iterations: number;
}

// ─── Decryption Options ──────────────────────────────────────────────────────

/**
 * Options for the `decryptBuffer` function.
 */
export interface DecryptBufferOptions {
    /** User-supplied password for key derivation */
    password: string;
}

/**
 * Options for the `decryptFile` function.
 */
export interface DecryptFileOptions {
    /** User-supplied password for key derivation */
    password: string;
}

/**
 * Options for stream-based decryption.
 */
export interface DecryptStreamOptions {
    /** User-supplied password for key derivation */
    password: string;

    /** Chunk size in bytes for stream processing */
    chunkSize?: number;
}

// ─── Result Types ────────────────────────────────────────────────────────────

/**
 * Result of a decryption operation.
 */
export interface DecryptionResult {
    /** The decrypted plaintext data */
    data: Buffer;

    /** Whether integrity verification passed (always true if no error thrown) */
    verified: boolean;
}

/**
 * Result of a file decryption operation.
 */
export interface DecryptFileResult {
    /** Path to the decrypted output file */
    outputPath: string;

    /** Original file name from metadata */
    originalFileName: string;

    /** Original MIME type from metadata */
    mimeType: string;

    /** Decrypted file size in bytes */
    size: number;

    /** Whether integrity verification passed */
    verified: boolean;
}

// ─── Utility Types ───────────────────────────────────────────────────────────

/**
 * Supported input types for encrypted data.
 */
export type DecryptionInput = Buffer | ArrayBuffer | Uint8Array;

/**
 * Callback for progress reporting during large file decryption.
 */
export type ProgressCallback = (
    bytesProcessed: number,
    totalBytes?: number,
) => void;

// ─── Error Types ─────────────────────────────────────────────────────────────

/**
 * Custom error class for decryption failures.
 * Provides structured error information for better error handling.
 */
export class DecryptionError extends Error {
    /** Error code for programmatic handling */
    public readonly code: DecryptionErrorCode;

    constructor(message: string, code: DecryptionErrorCode) {
        super(message);
        this.name = "DecryptionError";
        this.code = code;
    }
}

/**
 * Error codes for different decryption failure modes.
 */
export enum DecryptionErrorCode {
    /** The password is incorrect (GCM auth tag mismatch) */
    WRONG_PASSWORD = "WRONG_PASSWORD",

    /** The ciphertext has been tampered with */
    INTEGRITY_CHECK_FAILED = "INTEGRITY_CHECK_FAILED",

    /** The encrypted data format is invalid or corrupt */
    INVALID_FORMAT = "INVALID_FORMAT",

    /** The encryption version is not supported */
    UNSUPPORTED_VERSION = "UNSUPPORTED_VERSION",

    /** The input data is missing required fields */
    MISSING_FIELDS = "MISSING_FIELDS",

    /** File system error (file not found, permission denied, etc.) */
    FILE_ERROR = "FILE_ERROR",

    /** Generic / unexpected error */
    UNKNOWN = "UNKNOWN",
}
