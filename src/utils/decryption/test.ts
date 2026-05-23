/**
 * Decryption Module — Test Suite
 *
 * Run with: npx ts-node decryption/test.ts
 * Or:       npx tsx decryption/test.ts
 *
 * Tests all decryption functions including cross-module compatibility
 * with the encryption module.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

// Import from the encryption module (for producing test payloads)
import {
    encryptBuffer,
    encryptBufferRaw,
    encryptFile as encryptFileFn,
    encryptFileStream as encryptFileStreamFn,
    encryptText,
} from "../encryption/index";

// Import from the decryption module (under test)
import {
    decryptBuffer,
    decryptBufferRaw,
    decryptFile,
    decryptFileStream,
    decryptText,
    validatePayload,
    fromBase64,
    isValidBase64,
    secureWipe,
    DecryptionError,
    DecryptionErrorCode,
    ENCRYPTION_FORMAT_VERSION,
} from "./index";

// ─── Test Infrastructure ─────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const errors: string[] = [];

function assert(condition: boolean, message: string): void {
    if (condition) {
        passed++;
        console.log(`  ✓ ${message}`);
    } else {
        failed++;
        errors.push(message);
        console.error(`  ✗ ${message}`);
    }
}

async function test(name: string, fn: () => Promise<void>): Promise<void> {
    console.log(`\n▸ ${name}`);
    try {
        await fn();
    } catch (err) {
        failed++;
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${name}: ${msg}`);
        console.error(`  ✗ EXCEPTION: ${msg}`);
    }
}

// ─── Test Temp Directory ─────────────────────────────────────────────────────

const TEMP_DIR = path.join(__dirname, ".test-temp");

function setupTempDir(): void {
    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
}

function cleanupTempDir(): void {
    if (fs.existsSync(TEMP_DIR)) {
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

async function runTests(): Promise<void> {
    console.log("═══════════════════════════════════════════════");
    console.log("  DECRYPTION MODULE — TEST SUITE");
    console.log("═══════════════════════════════════════════════");

    setupTempDir();

    const PASSWORD = "test-password-123";
    const WRONG_PASSWORD = "wrong-password-999";

    // ── Buffer Encrypt → Decrypt Roundtrip ───────────────────────────────

    await test("decryptBuffer: roundtrip with simple text", async () => {
        const original = "Hello, World!";
        const encrypted = await encryptBuffer(Buffer.from(original), {
            password: PASSWORD,
        });
        const result = await decryptBuffer(encrypted, { password: PASSWORD });

        assert(result.data.toString("utf-8") === original, "Decrypted matches original");
        assert(result.verified === true, "Verified flag is true");
    });

    await test("decryptBuffer: roundtrip with binary data", async () => {
        const original = crypto.randomBytes(1024);
        const encrypted = await encryptBuffer(original, { password: PASSWORD });
        const result = await decryptBuffer(encrypted, { password: PASSWORD });

        assert(result.data.equals(original), "Binary data roundtrips correctly");
    });

    await test("decryptBuffer: roundtrip with large data (1 MB)", async () => {
        const original = crypto.randomBytes(1024 * 1024);
        const encrypted = await encryptBuffer(original, { password: PASSWORD });
        const result = await decryptBuffer(encrypted, { password: PASSWORD });

        assert(result.data.equals(original), "1 MB data roundtrips correctly");
    });

    await test("decryptBuffer: roundtrip with empty data", async () => {
        const original = Buffer.alloc(0);
        const encrypted = await encryptBuffer(original, { password: PASSWORD });
        const result = await decryptBuffer(encrypted, { password: PASSWORD });

        assert(result.data.length === 0, "Empty data roundtrips correctly");
    });

    // ── Wrong Password Tests ─────────────────────────────────────────────

    await test("decryptBuffer: wrong password throws DecryptionError", async () => {
        const encrypted = await encryptBuffer(Buffer.from("secret"), {
            password: PASSWORD,
        });

        try {
            await decryptBuffer(encrypted, { password: WRONG_PASSWORD });
            assert(false, "Should have thrown");
        } catch (err) {
            assert(err instanceof DecryptionError, "Throws DecryptionError");
            if (err instanceof DecryptionError) {
                assert(
                    err.code === DecryptionErrorCode.WRONG_PASSWORD,
                    "Error code is WRONG_PASSWORD",
                );
            }
        }
    });

    // ── Tampered Data Tests ──────────────────────────────────────────────

    await test("decryptBuffer: tampered ciphertext throws error", async () => {
        const encrypted = await encryptBuffer(Buffer.from("secret data"), {
            password: PASSWORD,
        });

        // Tamper with the ciphertext
        const cipherBytes = fromBase64(encrypted.cipherText);
        cipherBytes[0] ^= 0xff; // Flip bits
        encrypted.cipherText = cipherBytes.toString("base64");

        try {
            await decryptBuffer(encrypted, { password: PASSWORD });
            assert(false, "Should have thrown");
        } catch (err) {
            assert(err instanceof DecryptionError, "Throws DecryptionError on tamper");
        }
    });

    await test("decryptBuffer: tampered authTag throws error", async () => {
        const encrypted = await encryptBuffer(Buffer.from("secret data"), {
            password: PASSWORD,
        });

        // Tamper with the auth tag
        const tagBytes = fromBase64(encrypted.authTag);
        tagBytes[0] ^= 0xff;
        encrypted.authTag = tagBytes.toString("base64");

        try {
            await decryptBuffer(encrypted, { password: PASSWORD });
            assert(false, "Should have thrown");
        } catch (err) {
            assert(err instanceof DecryptionError, "Throws DecryptionError on tampered tag");
        }
    });

    // ── Raw Buffer Encrypt → Decrypt Roundtrip ──────────────────────────

    await test("decryptBufferRaw: roundtrip", async () => {
        const original = Buffer.from("Raw buffer test data");
        const encrypted = await encryptBufferRaw(original, { password: PASSWORD });
        const result = await decryptBufferRaw(encrypted, { password: PASSWORD });

        assert(result.data.equals(original), "Raw roundtrip successful");
        assert(result.verified === true, "Verified flag is true");
    });

    await test("decryptBufferRaw: wrong password throws", async () => {
        const encrypted = await encryptBufferRaw(Buffer.from("secret"), {
            password: PASSWORD,
        });

        try {
            await decryptBufferRaw(encrypted, { password: WRONG_PASSWORD });
            assert(false, "Should have thrown");
        } catch (err) {
            assert(err instanceof DecryptionError, "Throws DecryptionError");
        }
    });

    // ── Text Encrypt → Decrypt Roundtrip ─────────────────────────────────

    await test("decryptText: roundtrip", async () => {
        const original = "This is a secret message! 🔐";
        const encrypted = await encryptText(original, PASSWORD);
        const decrypted = await decryptText(encrypted, PASSWORD);

        assert(decrypted === original, "Text roundtrips correctly (including emoji)");
    });

    // ── File Encrypt → Decrypt Roundtrip ─────────────────────────────────

    await test("decryptFile: roundtrip with text file", async () => {
        const inputPath = path.join(TEMP_DIR, "plain.txt");
        const encPath = path.join(TEMP_DIR, "plain.txt.enc");
        const decPath = path.join(TEMP_DIR, "plain-decrypted.txt");
        const content = "Test file content for encryption/decryption.\n".repeat(50);

        fs.writeFileSync(inputPath, content);

        // Encrypt
        const metadata = await encryptFileFn(inputPath, encPath, {
            password: PASSWORD,
        });

        // Decrypt
        const result = await decryptFile(encPath, decPath, metadata, {
            password: PASSWORD,
        });

        const decryptedContent = fs.readFileSync(decPath, "utf-8");

        assert(decryptedContent === content, "File content matches after roundtrip");
        assert(result.originalFileName === "plain.txt", "Original filename preserved");
        assert(result.mimeType === "text/plain", "MIME type preserved");
        assert(result.size === Buffer.byteLength(content), "Size matches");
        assert(result.verified === true, "Verified flag is true");
    });

    await test("decryptFile: roundtrip with binary file", async () => {
        const inputPath = path.join(TEMP_DIR, "binary.bin");
        const encPath = path.join(TEMP_DIR, "binary.bin.enc");
        const decPath = path.join(TEMP_DIR, "binary-decrypted.bin");
        const content = crypto.randomBytes(4096);

        fs.writeFileSync(inputPath, content);

        const metadata = await encryptFileFn(inputPath, encPath, {
            password: PASSWORD,
        });

        const result = await decryptFile(encPath, decPath, metadata, {
            password: PASSWORD,
        });

        const decryptedContent = fs.readFileSync(decPath);
        assert(decryptedContent.equals(content), "Binary file roundtrips correctly");
        assert(result.size === content.length, "Size matches");
    });

    await test("decryptFile: wrong password fails", async () => {
        const inputPath = path.join(TEMP_DIR, "secret.txt");
        const encPath = path.join(TEMP_DIR, "secret.txt.enc");
        const decPath = path.join(TEMP_DIR, "secret-decrypted.txt");

        fs.writeFileSync(inputPath, "Top secret!");

        const metadata = await encryptFileFn(inputPath, encPath, {
            password: PASSWORD,
        });

        try {
            await decryptFile(encPath, decPath, metadata, {
                password: WRONG_PASSWORD,
            });
            assert(false, "Should have thrown");
        } catch (err) {
            assert(err instanceof DecryptionError, "Throws DecryptionError");
            assert(!fs.existsSync(decPath), "Partial output cleaned up");
        }
    });

    await test("decryptFile: non-existent file throws FILE_ERROR", async () => {
        const metadata = {
            salt: "AAAAAAAAAAAAAAAAAAAAAA==",
            iv: "AAAAAAAAAAAAAAAA",
            authTag: "AAAAAAAAAAAAAAAAAAAAAA==",
            originalFileName: "test.txt",
            mimeType: "text/plain",
            originalSize: 100,
            version: ENCRYPTION_FORMAT_VERSION,
            encryptedAt: new Date().toISOString(),
        };

        try {
            await decryptFile("/nonexistent.enc", "/tmp/out.txt", metadata, {
                password: PASSWORD,
            });
            assert(false, "Should have thrown");
        } catch (err) {
            assert(err instanceof DecryptionError, "Throws DecryptionError");
            if (err instanceof DecryptionError) {
                assert(
                    err.code === DecryptionErrorCode.FILE_ERROR,
                    "Error code is FILE_ERROR",
                );
            }
        }
    });

    // ── Stream File Decrypt Roundtrip ────────────────────────────────────

    await test("decryptFileStream: roundtrip", async () => {
        const inputPath = path.join(TEMP_DIR, "stream-plain.txt");
        const encPath = path.join(TEMP_DIR, "stream-plain.txt.enc");
        const decPath = path.join(TEMP_DIR, "stream-decrypted.txt");
        const content = "Stream decryption test.\n".repeat(200);

        fs.writeFileSync(inputPath, content);

        const metadata = await encryptFileStreamFn(inputPath, encPath, {
            password: PASSWORD,
        });

        let progressCalled = false;
        const result = await decryptFileStream(
            encPath,
            decPath,
            metadata,
            { password: PASSWORD },
            () => {
                progressCalled = true;
            },
        );

        const decryptedContent = fs.readFileSync(decPath, "utf-8");
        assert(decryptedContent === content, "Stream decryption matches");
        assert(progressCalled, "Progress callback was invoked");
        assert(result.verified === true, "Verified flag is true");
    });

    // ── Payload Validation Tests ─────────────────────────────────────────

    await test("validatePayload: accepts valid payload", async () => {
        const encrypted = await encryptBuffer(Buffer.from("test"), {
            password: PASSWORD,
        });
        try {
            validatePayload(encrypted);
            assert(true, "Valid payload accepted");
        } catch {
            assert(false, "Should not throw on valid payload");
        }
    });

    await test("validatePayload: rejects missing fields", async () => {
        try {
            validatePayload({} as any);
            assert(false, "Should have thrown");
        } catch (err) {
            assert(err instanceof DecryptionError, "Throws DecryptionError");
            if (err instanceof DecryptionError) {
                assert(
                    err.code === DecryptionErrorCode.MISSING_FIELDS,
                    "Error code is MISSING_FIELDS",
                );
            }
        }
    });

    await test("validatePayload: rejects wrong version", async () => {
        const encrypted = await encryptBuffer(Buffer.from("test"), {
            password: PASSWORD,
        });
        encrypted.version = 999;

        try {
            validatePayload(encrypted);
            assert(false, "Should have thrown");
        } catch (err) {
            assert(err instanceof DecryptionError, "Throws DecryptionError");
            if (err instanceof DecryptionError) {
                assert(
                    err.code === DecryptionErrorCode.UNSUPPORTED_VERSION,
                    "Error code is UNSUPPORTED_VERSION",
                );
            }
        }
    });

    await test("validatePayload: rejects invalid base-64", async () => {
        try {
            validatePayload({
                cipherText: "not-valid!!!",
                salt: "also-bad",
                iv: "nope",
                authTag: "nah",
                version: ENCRYPTION_FORMAT_VERSION,
            });
            assert(false, "Should have thrown");
        } catch (err) {
            assert(err instanceof DecryptionError, "Throws DecryptionError");
            if (err instanceof DecryptionError) {
                assert(
                    err.code === DecryptionErrorCode.INVALID_FORMAT,
                    "Error code is INVALID_FORMAT",
                );
            }
        }
    });

    // ── Edge Cases ───────────────────────────────────────────────────────

    await test("decryptBuffer: empty password throws", async () => {
        const encrypted = await encryptBuffer(Buffer.from("test"), {
            password: PASSWORD,
        });

        try {
            await decryptBuffer(encrypted, { password: "" });
            assert(false, "Should have thrown");
        } catch (err) {
            assert(err instanceof DecryptionError, "Throws DecryptionError");
        }
    });

    await test("secureWipe: zeros buffer", async () => {
        const buf = Buffer.from("secret key material");
        secureWipe(buf);
        assert(buf.every((b) => b === 0), "Buffer is zeroed out");
    });

    // ── Cleanup ──────────────────────────────────────────────────────────

    cleanupTempDir();

    // ── Summary ──────────────────────────────────────────────────────────

    console.log("\n═══════════════════════════════════════════════");
    console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
    if (errors.length > 0) {
        console.log("\n  FAILURES:");
        errors.forEach((e) => console.log(`    - ${e}`));
    }
    console.log("═══════════════════════════════════════════════\n");

    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
    console.error("Fatal error:", err);
    cleanupTempDir();
    process.exit(1);
});
