/**
 * Encryption Constants
 *
 * Central configuration for all cryptographic parameters used across
 * the encryption pipeline. Changing values here affects the entire module.
 *
 * IMPORTANT: Once in production, do NOT change these values — doing so
 * will make previously encrypted files unreadable.
 */

// ─── AES-GCM Configuration ──────────────────────────────────────────────────

/** AES key length in bits (256 = military-grade) */
export const AES_KEY_LENGTH_BITS = 256;

/** AES key length in bytes */
export const AES_KEY_LENGTH_BYTES = AES_KEY_LENGTH_BITS / 8; // 32

/** AES-GCM algorithm identifier */
export const AES_ALGORITHM = "aes-256-gcm" as const;

/** GCM authentication tag length in bytes (128-bit tag = max security) */
export const GCM_AUTH_TAG_LENGTH_BYTES = 16;

// ─── PBKDF2 Key Derivation Configuration ─────────────────────────────────────

/** Number of PBKDF2 iterations — OWASP recommends ≥ 600,000 for SHA-256 */
export const PBKDF2_ITERATIONS = 150_000;

/** Hash algorithm used by PBKDF2 */
export const PBKDF2_DIGEST = "sha256" as const;

// ─── Random Value Lengths ────────────────────────────────────────────────────

/** Salt length in bytes for PBKDF2 (128-bit) */
export const SALT_LENGTH_BYTES = 16;

/** Initialization Vector length in bytes for AES-GCM (96-bit per NIST) */
export const IV_LENGTH_BYTES = 12;

// ─── Stream Configuration ────────────────────────────────────────────────────

/** Default chunk size for stream-based encryption (64 KB) */
export const STREAM_CHUNK_SIZE = 64 * 1024;

// ─── Encoding ────────────────────────────────────────────────────────────────

/** Default encoding for serialized encrypted output */
export const OUTPUT_ENCODING = "base64" as const;

// ─── File Format Version ─────────────────────────────────────────────────────

/**
 * Version tag embedded in encrypted payloads for future-proofing.
 * If the encryption scheme changes, bump this version so the decryption
 * module can detect and branch accordingly.
 */
export const ENCRYPTION_FORMAT_VERSION = 1;
