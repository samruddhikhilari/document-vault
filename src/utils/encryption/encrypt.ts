/**
 * Core Encryption Module
 *
 * Provides AES-256-GCM authenticated encryption for buffers and files.
 * Uses Node.js built-in `crypto` module — no third-party dependencies.
 *
 * Security properties:
 *  - AES-256-GCM: Authenticated encryption with 256-bit key
 *  - PBKDF2-SHA256 with 150,000 iterations for password-based key derivation
 *  - Random 16-byte salt per encryption (unique key per operation)
 *  - Random 12-byte IV per encryption (NIST recommended for GCM)
 *  - 128-bit GCM authentication tag prevents tampering
 *  - Decryption fails if password is wrong OR data is tampered (integrity)
 *
 * IMPORTANT:
 *  - The password must NEVER be stored or logged.
 *  - The salt, IV, and authTag must be stored alongside the ciphertext
 *    (they are NOT secret — only the password is secret).
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";

import {
    AES_ALGORITHM,
    GCM_AUTH_TAG_LENGTH_BYTES,
    IV_LENGTH_BYTES,
    ENCRYPTION_FORMAT_VERSION,
} from "./constants";
import { deriveKey } from "./key";
import {
    normalizeInput,
    toBase64,
    generateIV,
    validatePassword,
} from "./utils";
import type {
    EncryptedPayload,
    EncryptedPayloadRaw,
    EncryptBufferOptions,
    EncryptFileOptions,
    EncryptionMetadata,
    EncryptionInput,
    ProgressCallback,
} from "./types";

// ─── Buffer Encryption ──────────────────────────────────────────────────────

/**
 * Encrypt a buffer using AES-256-GCM with password-based key derivation.
 *
 * A fresh random salt and IV are generated for every call, ensuring that
 * encrypting the same plaintext twice produces different ciphertext.
 *
 * @param data      Raw data to encrypt (Buffer, ArrayBuffer, Uint8Array, or string).
 * @param options   Encryption options including the password.
 * @returns         `EncryptedPayload` with base-64 encoded fields.
 *
 * @example
 * ```ts
 * import { encryptBuffer } from "./encrypt";
 *
 * const fileData = fs.readFileSync("document.pdf");
 * const encrypted = await encryptBuffer(fileData, { password: "my-secret" });
 *
 * // Store encrypted.cipherText, encrypted.salt, encrypted.iv, encrypted.authTag
 * ```
 */
export async function encryptBuffer(
    data: EncryptionInput,
    options: EncryptBufferOptions,
): Promise<EncryptedPayload> {
    validatePassword(options.password);

    const plainBuffer: Buffer = normalizeInput(data);

    // Generate cryptographically secure random salt and IV
    const iv: Buffer = options.iv ?? generateIV();
    const { key, salt } = await deriveKey(options.password, options.salt);

    // Create AES-256-GCM cipher
    const cipher = crypto.createCipheriv(AES_ALGORITHM, key, iv, {
        authTagLength: GCM_AUTH_TAG_LENGTH_BYTES,
    });

    // Encrypt the data
    const encrypted = Buffer.concat([
        cipher.update(plainBuffer),
        cipher.final(),
    ]);

    // Get the GCM authentication tag
    const authTag: Buffer = cipher.getAuthTag();

    // Securely wipe the key from memory
    key.fill(0);

    return {
        cipherText: toBase64(encrypted),
        salt: toBase64(salt),
        iv: toBase64(iv),
        authTag: toBase64(authTag),
        version: ENCRYPTION_FORMAT_VERSION,
    };
}

/**
 * Encrypt a buffer and return raw binary output (no base-64 encoding).
 * More efficient for server-side pipelines where data stays as buffers.
 *
 * @param data      Raw data to encrypt.
 * @param options   Encryption options including the password.
 * @returns         `EncryptedPayloadRaw` with Buffer fields.
 */
export async function encryptBufferRaw(
    data: EncryptionInput,
    options: EncryptBufferOptions,
): Promise<EncryptedPayloadRaw> {
    validatePassword(options.password);

    const plainBuffer: Buffer = normalizeInput(data);

    const iv: Buffer = options.iv ?? generateIV();
    const { key, salt } = await deriveKey(options.password, options.salt);

    const cipher = crypto.createCipheriv(AES_ALGORITHM, key, iv, {
        authTagLength: GCM_AUTH_TAG_LENGTH_BYTES,
    });

    const cipherBytes = Buffer.concat([
        cipher.update(plainBuffer),
        cipher.final(),
    ]);

    const authTag: Buffer = cipher.getAuthTag();

    key.fill(0);

    return {
        cipherBytes,
        salt,
        iv,
        authTag,
        version: ENCRYPTION_FORMAT_VERSION,
    };
}

// ─── File Encryption ─────────────────────────────────────────────────────────

/**
 * Encrypt a file from disk and write the encrypted output to a new file.
 *
 * Reads the entire file into memory, encrypts it, and writes the ciphertext.
 * For very large files (> 500 MB), consider using `encryptFileStream` instead.
 *
 * @param inputPath   Path to the plaintext file.
 * @param outputPath  Path where the encrypted file will be written.
 * @param options     Encryption options including the password.
 * @returns           Encryption metadata (salt, IV, authTag, etc.).
 *
 * @example
 * ```ts
 * import { encryptFile } from "./encrypt";
 *
 * const metadata = await encryptFile(
 *     "/path/to/document.pdf",
 *     "/path/to/document.pdf.enc",
 *     { password: "my-secret" }
 * );
 *
 * // Save metadata to database for decryption later
 * console.log(metadata.salt, metadata.iv, metadata.authTag);
 * ```
 */
export async function encryptFile(
    inputPath: string,
    outputPath: string,
    options: EncryptFileOptions,
): Promise<EncryptionMetadata> {
    validatePassword(options.password);

    // Validate input file exists
    if (!fs.existsSync(inputPath)) {
        throw new Error(`Input file not found: ${inputPath}`);
    }

    const stat = fs.statSync(inputPath);
    if (!stat.isFile()) {
        throw new Error(`Input path is not a file: ${inputPath}`);
    }

    // Read the entire file into memory
    const plainBuffer: Buffer = fs.readFileSync(inputPath);

    // Encrypt the buffer
    const encrypted = await encryptBufferRaw(plainBuffer, options);

    // Ensure the output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write the encrypted data to the output file
    fs.writeFileSync(outputPath, encrypted.cipherBytes);

    // Securely wipe the plaintext buffer
    plainBuffer.fill(0);

    // Build metadata
    const metadata: EncryptionMetadata = {
        salt: toBase64(encrypted.salt),
        iv: toBase64(encrypted.iv),
        authTag: toBase64(encrypted.authTag),
        originalFileName: path.basename(inputPath),
        mimeType: guessMimeType(inputPath),
        originalSize: stat.size,
        version: ENCRYPTION_FORMAT_VERSION,
        encryptedAt: new Date().toISOString(),
    };

    return metadata;
}

// ─── Stream-Based File Encryption ────────────────────────────────────────────

/**
 * Encrypt a file using streams — suitable for very large files.
 *
 * Reads the input file in chunks, encrypts each chunk via a cipher stream,
 * and writes the encrypted output. Uses constant memory regardless of file size.
 *
 * @param inputPath    Path to the plaintext file.
 * @param outputPath   Path where the encrypted file will be written.
 * @param options      Encryption options including the password.
 * @param onProgress   Optional callback for progress reporting.
 * @returns            Promise resolving to encryption metadata.
 *
 * @example
 * ```ts
 * import { encryptFileStream } from "./encrypt";
 *
 * const metadata = await encryptFileStream(
 *     "/path/to/large-video.mp4",
 *     "/path/to/large-video.mp4.enc",
 *     { password: "my-secret" },
 *     (processed, total) => {
 *         console.log(`Progress: ${((processed / total!) * 100).toFixed(1)}%`);
 *     }
 * );
 * ```
 */
export async function encryptFileStream(
    inputPath: string,
    outputPath: string,
    options: EncryptFileOptions,
    onProgress?: ProgressCallback,
): Promise<EncryptionMetadata> {
    validatePassword(options.password);

    if (!fs.existsSync(inputPath)) {
        throw new Error(`Input file not found: ${inputPath}`);
    }

    const stat = fs.statSync(inputPath);
    if (!stat.isFile()) {
        throw new Error(`Input path is not a file: ${inputPath}`);
    }

    // Generate IV and derive key
    const iv: Buffer = options.iv ?? generateIV();
    const { key, salt } = await deriveKey(options.password, options.salt);

    // Create cipher
    const cipher = crypto.createCipheriv(AES_ALGORITHM, key, iv, {
        authTagLength: GCM_AUTH_TAG_LENGTH_BYTES,
    });

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Set up streams
    const readStream = fs.createReadStream(inputPath);
    const writeStream = fs.createWriteStream(outputPath);

    return new Promise<EncryptionMetadata>((resolve, reject) => {
        let bytesProcessed = 0;
        const totalBytes = stat.size;

        readStream.on("data", (chunk) => {
            const chunkSize =
                typeof chunk === "string"
                    ? Buffer.byteLength(chunk)
                    : chunk.length;
            bytesProcessed += chunkSize;
            onProgress?.(bytesProcessed, totalBytes);
        });

        readStream.on("error", (err) => {
            key.fill(0);
            reject(new Error(`Failed to read input file: ${err.message}`));
        });

        writeStream.on("error", (err) => {
            key.fill(0);
            reject(new Error(`Failed to write output file: ${err.message}`));
        });

        writeStream.on("finish", () => {
            const authTag: Buffer = cipher.getAuthTag();
            key.fill(0);

            resolve({
                salt: toBase64(salt),
                iv: toBase64(iv),
                authTag: toBase64(authTag),
                originalFileName: path.basename(inputPath),
                mimeType: guessMimeType(inputPath),
                originalSize: stat.size,
                version: ENCRYPTION_FORMAT_VERSION,
                encryptedAt: new Date().toISOString(),
            });
        });

        // Pipe: readStream → cipher → writeStream
        readStream.pipe(cipher).pipe(writeStream);
    });
}

// ─── Text Encryption (convenience) ──────────────────────────────────────────

/**
 * Encrypt a plaintext string. Convenience wrapper around `encryptBuffer`.
 *
 * @param text      The plaintext string to encrypt.
 * @param password  The encryption password.
 * @returns         `EncryptedPayload` with base-64 encoded fields.
 *
 * @example
 * ```ts
 * const encrypted = await encryptText("my secret note", "my-password");
 * ```
 */
export async function encryptText(
    text: string,
    password: string,
): Promise<EncryptedPayload> {
    return encryptBuffer(Buffer.from(text, "utf-8"), { password });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Guess a MIME type from a file extension.
 * Returns "application/octet-stream" for unknown types.
 */
function guessMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
        ".pdf": "application/pdf",
        ".doc": "application/msword",
        ".docx":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xls": "application/vnd.ms-excel",
        ".xlsx":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".ppt": "application/vnd.ms-powerpoint",
        ".pptx":
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".txt": "text/plain",
        ".csv": "text/csv",
        ".json": "application/json",
        ".xml": "application/xml",
        ".html": "text/html",
        ".htm": "text/html",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
        ".webp": "image/webp",
        ".mp4": "video/mp4",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".zip": "application/zip",
        ".rar": "application/x-rar-compressed",
        ".7z": "application/x-7z-compressed",
        ".tar": "application/x-tar",
        ".gz": "application/gzip",
    };
    return mimeTypes[ext] ?? "application/octet-stream";
}
