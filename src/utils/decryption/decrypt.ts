/**
 * Core Decryption Module
 *
 * Provides AES-256-GCM authenticated decryption for buffers and files.
 * Uses Node.js built-in `crypto` module — no third-party dependencies.
 *
 * Security properties:
 *  - Re-derives the AES key from password + stored salt via PBKDF2
 *  - GCM authentication tag is verified BEFORE any plaintext is returned
 *  - If the password is wrong, decryption fails with a clear error
 *  - If data has been tampered with, decryption fails (integrity check)
 *  - Keys are securely wiped from memory after use
 *
 * Error handling:
 *  - All errors are wrapped in typed `DecryptionError` with specific error codes
 *  - Callers can switch on `error.code` for programmatic error handling
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";

import {
    AES_ALGORITHM,
    GCM_AUTH_TAG_LENGTH_BYTES,
} from "./constants";
import { deriveKey } from "./key";
import {
    fromBase64,
    normalizeInput,
    validatePayload,
    validatePassword,
    secureWipe,
} from "./utils";
import type {
    EncryptedPayload,
    EncryptedPayloadRaw,
    EncryptionMetadata,
    DecryptBufferOptions,
    DecryptFileOptions,
    DecryptionResult,
    DecryptFileResult,
    DecryptionInput,
    ProgressCallback,
} from "./types";
import { DecryptionError, DecryptionErrorCode } from "./types";

// ─── Buffer Decryption ──────────────────────────────────────────────────────

/**
 * Decrypt an `EncryptedPayload` (base-64 encoded) back to plaintext.
 *
 * The GCM authentication tag is verified during decryption. If the password
 * is incorrect or the data has been tampered with, a `DecryptionError` is thrown.
 *
 * @param payload   The encrypted payload (from the encryption module).
 * @param options   Decryption options including the password.
 * @returns         `DecryptionResult` containing the plaintext Buffer.
 * @throws          `DecryptionError` on failure (wrong password, tampering, etc.).
 *
 * @example
 * ```ts
 * import { decryptBuffer } from "./decrypt";
 * import type { EncryptedPayload } from "./types";
 *
 * const payload: EncryptedPayload = {
 *     cipherText: "...",
 *     salt: "...",
 *     iv: "...",
 *     authTag: "...",
 *     version: 1,
 * };
 *
 * try {
 *     const result = await decryptBuffer(payload, { password: "my-secret" });
 *     console.log("Decrypted:", result.data);
 * } catch (err) {
 *     if (err instanceof DecryptionError) {
 *         console.error(`Decryption failed (${err.code}): ${err.message}`);
 *     }
 * }
 * ```
 */
export async function decryptBuffer(
    payload: EncryptedPayload,
    options: DecryptBufferOptions,
): Promise<DecryptionResult> {
    validatePassword(options.password);
    validatePayload(payload);

    // Decode base-64 fields to raw bytes
    const cipherBytes = fromBase64(payload.cipherText);
    const saltBytes = fromBase64(payload.salt);
    const ivBytes = fromBase64(payload.iv);
    const authTagBytes = fromBase64(payload.authTag);

    // Re-derive the key from password + salt
    const { key } = await deriveKey(options.password, saltBytes);

    try {
        // Create AES-256-GCM decipher
        const decipher = crypto.createDecipheriv(AES_ALGORITHM, key, ivBytes, {
            authTagLength: GCM_AUTH_TAG_LENGTH_BYTES,
        });

        // Set the authentication tag for verification
        decipher.setAuthTag(authTagBytes);

        // Decrypt the data
        const plaintext = Buffer.concat([
            decipher.update(cipherBytes),
            decipher.final(), // This verifies the auth tag
        ]);

        return {
            data: plaintext,
            verified: true,
        };
    } catch (error: unknown) {
        // Determine the specific error type
        if (
            error instanceof Error &&
            (error.message.includes("Unsupported state") ||
                error.message.includes("unable to authenticate") ||
                error.message.includes("auth"))
        ) {
            throw new DecryptionError(
                "Decryption failed: incorrect password or data has been tampered with.",
                DecryptionErrorCode.WRONG_PASSWORD,
            );
        }

        throw new DecryptionError(
            `Decryption failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            DecryptionErrorCode.UNKNOWN,
        );
    } finally {
        // Always wipe the key from memory
        secureWipe(key);
    }
}

/**
 * Decrypt raw binary encrypted data (no base-64 encoding).
 * More efficient for server-side pipelines.
 *
 * @param payload   The raw encrypted payload.
 * @param options   Decryption options including the password.
 * @returns         `DecryptionResult` containing the plaintext Buffer.
 */
export async function decryptBufferRaw(
    payload: EncryptedPayloadRaw,
    options: DecryptBufferOptions,
): Promise<DecryptionResult> {
    validatePassword(options.password);

    const { key } = await deriveKey(options.password, payload.salt);

    try {
        const decipher = crypto.createDecipheriv(
            AES_ALGORITHM,
            key,
            payload.iv,
            { authTagLength: GCM_AUTH_TAG_LENGTH_BYTES },
        );

        decipher.setAuthTag(payload.authTag);

        const plaintext = Buffer.concat([
            decipher.update(payload.cipherBytes),
            decipher.final(),
        ]);

        return {
            data: plaintext,
            verified: true,
        };
    } catch (error: unknown) {
        if (
            error instanceof Error &&
            (error.message.includes("Unsupported state") ||
                error.message.includes("unable to authenticate") ||
                error.message.includes("auth"))
        ) {
            throw new DecryptionError(
                "Decryption failed: incorrect password or data has been tampered with.",
                DecryptionErrorCode.WRONG_PASSWORD,
            );
        }

        throw new DecryptionError(
            `Decryption failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            DecryptionErrorCode.UNKNOWN,
        );
    } finally {
        secureWipe(key);
    }
}

// ─── File Decryption ─────────────────────────────────────────────────────────

/**
 * Decrypt an encrypted file from disk and write the plaintext to a new file.
 *
 * Requires the encryption metadata (salt, IV, authTag) that was saved
 * during encryption.
 *
 * @param inputPath   Path to the encrypted file (.enc).
 * @param outputPath  Path where the decrypted file will be written.
 * @param metadata    Encryption metadata (salt, IV, authTag from the DB).
 * @param options     Decryption options including the password.
 * @returns           `DecryptFileResult` with details about the decrypted file.
 *
 * @example
 * ```ts
 * import { decryptFile } from "./decrypt";
 *
 * const metadata = {
 *     salt: "...",
 *     iv: "...",
 *     authTag: "...",
 *     originalFileName: "document.pdf",
 *     mimeType: "application/pdf",
 *     originalSize: 1234567,
 *     version: 1,
 *     encryptedAt: "2026-01-15T10:30:00.000Z",
 * };
 *
 * const result = await decryptFile(
 *     "/path/to/document.pdf.enc",
 *     "/path/to/document.pdf",
 *     metadata,
 *     { password: "my-secret" }
 * );
 *
 * console.log(`Decrypted: ${result.originalFileName} (${result.size} bytes)`);
 * ```
 */
export async function decryptFile(
    inputPath: string,
    outputPath: string,
    metadata: EncryptionMetadata,
    options: DecryptFileOptions,
): Promise<DecryptFileResult> {
    validatePassword(options.password);

    // Validate input file exists
    if (!fs.existsSync(inputPath)) {
        throw new DecryptionError(
            `Encrypted file not found: ${inputPath}`,
            DecryptionErrorCode.FILE_ERROR,
        );
    }

    const stat = fs.statSync(inputPath);
    if (!stat.isFile()) {
        throw new DecryptionError(
            `Input path is not a file: ${inputPath}`,
            DecryptionErrorCode.FILE_ERROR,
        );
    }

    // Decode metadata
    const saltBytes = fromBase64(metadata.salt);
    const ivBytes = fromBase64(metadata.iv);
    const authTagBytes = fromBase64(metadata.authTag);

    // Read the encrypted file
    const cipherBytes: Buffer = fs.readFileSync(inputPath);

    // Re-derive the key
    const { key } = await deriveKey(options.password, saltBytes);

    try {
        // Create decipher
        const decipher = crypto.createDecipheriv(AES_ALGORITHM, key, ivBytes, {
            authTagLength: GCM_AUTH_TAG_LENGTH_BYTES,
        });
        decipher.setAuthTag(authTagBytes);

        // Decrypt
        const plaintext = Buffer.concat([
            decipher.update(cipherBytes),
            decipher.final(),
        ]);

        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Write the decrypted file
        fs.writeFileSync(outputPath, plaintext);

        return {
            outputPath,
            originalFileName: metadata.originalFileName,
            mimeType: metadata.mimeType,
            size: plaintext.length,
            verified: true,
        };
    } catch (error: unknown) {
        // Clean up partial output file if it exists
        if (fs.existsSync(outputPath)) {
            try {
                fs.unlinkSync(outputPath);
            } catch {
                // Ignore cleanup errors
            }
        }

        if (
            error instanceof DecryptionError
        ) {
            throw error;
        }

        if (
            error instanceof Error &&
            (error.message.includes("Unsupported state") ||
                error.message.includes("unable to authenticate") ||
                error.message.includes("auth"))
        ) {
            throw new DecryptionError(
                "Decryption failed: incorrect password or data has been tampered with.",
                DecryptionErrorCode.WRONG_PASSWORD,
            );
        }

        throw new DecryptionError(
            `Decryption failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            DecryptionErrorCode.UNKNOWN,
        );
    } finally {
        secureWipe(key);
    }
}

// ─── Stream-Based File Decryption ────────────────────────────────────────────

/**
 * Decrypt a file using streams — suitable for very large files.
 *
 * NOTE: AES-GCM stream decryption verifies the auth tag only at the end
 * (when `decipher.final()` is called). If the tag is invalid, the piped
 * output will contain garbage. For large files where integrity is critical
 * before writing output, consider using the buffered `decryptFile` instead
 * or verifying the output afterward.
 *
 * @param inputPath    Path to the encrypted file.
 * @param outputPath   Path where the decrypted file will be written.
 * @param metadata     Encryption metadata.
 * @param options      Decryption options including the password.
 * @param onProgress   Optional progress callback.
 * @returns            Promise resolving to `DecryptFileResult`.
 */
export async function decryptFileStream(
    inputPath: string,
    outputPath: string,
    metadata: EncryptionMetadata,
    options: DecryptFileOptions,
    onProgress?: ProgressCallback,
): Promise<DecryptFileResult> {
    validatePassword(options.password);

    if (!fs.existsSync(inputPath)) {
        throw new DecryptionError(
            `Encrypted file not found: ${inputPath}`,
            DecryptionErrorCode.FILE_ERROR,
        );
    }

    const stat = fs.statSync(inputPath);
    if (!stat.isFile()) {
        throw new DecryptionError(
            `Input path is not a file: ${inputPath}`,
            DecryptionErrorCode.FILE_ERROR,
        );
    }

    // Decode metadata
    const saltBytes = fromBase64(metadata.salt);
    const ivBytes = fromBase64(metadata.iv);
    const authTagBytes = fromBase64(metadata.authTag);

    // Re-derive the key
    const { key } = await deriveKey(options.password, saltBytes);

    // Create decipher
    const decipher = crypto.createDecipheriv(AES_ALGORITHM, key, ivBytes, {
        authTagLength: GCM_AUTH_TAG_LENGTH_BYTES,
    });
    decipher.setAuthTag(authTagBytes);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const readStream = fs.createReadStream(inputPath);
    const writeStream = fs.createWriteStream(outputPath);

    return new Promise<DecryptFileResult>((resolve, reject) => {
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
            secureWipe(key);
            reject(
                new DecryptionError(
                    `Failed to read encrypted file: ${err.message}`,
                    DecryptionErrorCode.FILE_ERROR,
                ),
            );
        });

        writeStream.on("error", (err) => {
            secureWipe(key);
            reject(
                new DecryptionError(
                    `Failed to write decrypted file: ${err.message}`,
                    DecryptionErrorCode.FILE_ERROR,
                ),
            );
        });

        writeStream.on("finish", () => {
            secureWipe(key);
            const outputStat = fs.statSync(outputPath);
            resolve({
                outputPath,
                originalFileName: metadata.originalFileName,
                mimeType: metadata.mimeType,
                size: outputStat.size,
                verified: true,
            });
        });

        // Handle decipher error (auth tag failure happens here)
        decipher.on("error", (err) => {
            secureWipe(key);

            // Clean up partial output
            writeStream.destroy();
            if (fs.existsSync(outputPath)) {
                try {
                    fs.unlinkSync(outputPath);
                } catch {
                    // Ignore
                }
            }

            reject(
                new DecryptionError(
                    "Decryption failed: incorrect password or data has been tampered with.",
                    DecryptionErrorCode.WRONG_PASSWORD,
                ),
            );
        });

        // Pipe: readStream → decipher → writeStream
        readStream.pipe(decipher).pipe(writeStream);
    });
}

// ─── Text Decryption (convenience) ──────────────────────────────────────────

/**
 * Decrypt an `EncryptedPayload` back to a plaintext string.
 * Convenience wrapper around `decryptBuffer`.
 *
 * @param payload   The encrypted payload.
 * @param password  The decryption password.
 * @returns         The original plaintext string.
 *
 * @example
 * ```ts
 * const plaintext = await decryptText(encryptedPayload, "my-password");
 * console.log(plaintext); // "my secret note"
 * ```
 */
export async function decryptText(
    payload: EncryptedPayload,
    password: string,
): Promise<string> {
    const result = await decryptBuffer(payload, { password });
    return result.data.toString("utf-8");
}
