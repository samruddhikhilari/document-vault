/**
 * Decryption Constants
 *
 * Central configuration for all cryptographic parameters used across
 * the decryption pipeline. These MUST match the encryption module's
 * constants — changing them independently will break decryption.
 *
 * IMPORTANT: These values are intentionally duplicated from the encryption
 * module so that the decryption module can operate independently.
 */

// ─── AES-GCM Configuration ──────────────────────────────────────────────────

/** AES key length in bits */
export const AES_KEY_LENGTH_BITS = 256;

/** AES key length in bytes */
export const AES_KEY_LENGTH_BYTES = AES_KEY_LENGTH_BITS / 8; // 32

/** AES-GCM algorithm identifier */
export const AES_ALGORITHM = "aes-256-gcm" as const;

/** GCM authentication tag length in bytes */
export const GCM_AUTH_TAG_LENGTH_BYTES = 16;

// ─── PBKDF2 Key Derivation Configuration ─────────────────────────────────────

/** Number of PBKDF2 iterations (must match encryption) */
export const PBKDF2_ITERATIONS = 150_000;

/** Hash algorithm used by PBKDF2 */
export const PBKDF2_DIGEST = "sha256" as const;

// ─── Random Value Lengths ────────────────────────────────────────────────────

/** Salt length in bytes for PBKDF2 */
export const SALT_LENGTH_BYTES = 16;

/** Initialization Vector length in bytes for AES-GCM */
export const IV_LENGTH_BYTES = 12;

// ─── Stream Configuration ────────────────────────────────────────────────────

/** Default chunk size for stream-based decryption (64 KB) */
export const STREAM_CHUNK_SIZE = 64 * 1024;

// ─── Encoding ────────────────────────────────────────────────────────────────

/** Default encoding for serialized encrypted output */
export const OUTPUT_ENCODING = "base64" as const;

// ─── File Format Version ─────────────────────────────────────────────────────

/** Expected encryption format version */
export const ENCRYPTION_FORMAT_VERSION = 1;
