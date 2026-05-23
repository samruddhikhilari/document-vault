/**
 * Encryption Module — Test Suite
 *
 * Run with: npx ts-node encryption/test.ts
 * Or:       npx tsx encryption/test.ts
 *
 * Tests all encryption functions to verify correctness.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

import {
    encryptBuffer,
    encryptBufferRaw,
    encryptFile,
    encryptFileStream,
    encryptText,
    deriveKey,
    deriveKeySync,
    generateSalt,
    generateIV,
    toBase64,
    fromBase64,
    isValidBase64,
    validatePassword,
    secureWipe,
    SALT_LENGTH_BYTES,
    IV_LENGTH_BYTES,
    AES_KEY_LENGTH_BYTES,
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
    console.log("  ENCRYPTION MODULE — TEST SUITE");
    console.log("═══════════════════════════════════════════════");

    setupTempDir();

    // ── Key Derivation Tests ─────────────────────────────────────────────

    await test("deriveKey: produces 32-byte key", async () => {
        const { key, salt, iterations } = await deriveKey("test-password");
        assert(key.length === AES_KEY_LENGTH_BYTES, `Key is ${AES_KEY_LENGTH_BYTES} bytes`);
        assert(salt.length === SALT_LENGTH_BYTES, `Salt is ${SALT_LENGTH_BYTES} bytes`);
        assert(iterations === 150_000, "Iterations = 150,000");
    });

    await test("deriveKey: same password + salt = same key", async () => {
        const salt = generateSalt();
        const { key: key1 } = await deriveKey("my-password", salt);
        const { key: key2 } = await deriveKey("my-password", salt);
        assert(key1.equals(key2), "Keys are identical");
    });

    await test("deriveKey: different passwords = different keys", async () => {
        const salt = generateSalt();
        const { key: key1 } = await deriveKey("password-1", salt);
        const { key: key2 } = await deriveKey("password-2", salt);
        assert(!key1.equals(key2), "Keys are different");
    });

    await test("deriveKey: different salts = different keys", async () => {
        const { key: key1 } = await deriveKey("same-password", generateSalt());
        const { key: key2 } = await deriveKey("same-password", generateSalt());
        assert(!key1.equals(key2), "Keys are different");
    });

    await test("deriveKeySync: matches async version", async () => {
        const salt = generateSalt();
        const { key: asyncKey } = await deriveKey("test-pw", salt);
        const { key: syncKey } = deriveKeySync("test-pw", salt);
        assert(asyncKey.equals(syncKey), "Sync and async keys match");
    });

    await test("deriveKey: rejects empty password", async () => {
        try {
            await deriveKey("");
            assert(false, "Should have thrown");
        } catch {
            assert(true, "Throws on empty password");
        }
    });

    // ── Buffer Encryption Tests ──────────────────────────────────────────

    await test("encryptBuffer: encrypts and returns valid payload", async () => {
        const data = Buffer.from("Hello, World!");
        const payload = await encryptBuffer(data, { password: "test-password-123" });

        assert(typeof payload.cipherText === "string", "cipherText is string");
        assert(typeof payload.salt === "string", "salt is string");
        assert(typeof payload.iv === "string", "iv is string");
        assert(typeof payload.authTag === "string", "authTag is string");
        assert(payload.version === ENCRYPTION_FORMAT_VERSION, "version matches");
        assert(isValidBase64(payload.cipherText), "cipherText is valid base-64");
        assert(isValidBase64(payload.salt), "salt is valid base-64");
        assert(isValidBase64(payload.iv), "iv is valid base-64");
        assert(isValidBase64(payload.authTag), "authTag is valid base-64");
    });

    await test("encryptBuffer: cipherText differs from plaintext", async () => {
        const plaintext = "This is sensitive data";
        const payload = await encryptBuffer(Buffer.from(plaintext), {
            password: "test-password-123",
        });
        const cipherBytes = fromBase64(payload.cipherText);
        assert(
            !cipherBytes.equals(Buffer.from(plaintext)),
            "Ciphertext is different from plaintext",
        );
    });

    await test("encryptBuffer: encrypting same data twice produces different results", async () => {
        const data = Buffer.from("Same data");
        const p1 = await encryptBuffer(data, { password: "test-password-123" });
        const p2 = await encryptBuffer(data, { password: "test-password-123" });
        assert(p1.cipherText !== p2.cipherText, "Ciphertexts differ");
        assert(p1.salt !== p2.salt, "Salts differ");
        assert(p1.iv !== p2.iv, "IVs differ");
    });

    await test("encryptBuffer: salt and IV have correct sizes", async () => {
        const payload = await encryptBuffer(Buffer.from("test"), {
            password: "test-password-123",
        });
        assert(fromBase64(payload.salt).length === SALT_LENGTH_BYTES, "Salt is 16 bytes");
        assert(fromBase64(payload.iv).length === IV_LENGTH_BYTES, "IV is 12 bytes");
        assert(fromBase64(payload.authTag).length === 16, "AuthTag is 16 bytes");
    });

    await test("encryptBuffer: rejects weak password", async () => {
        try {
            await encryptBuffer(Buffer.from("test"), { password: "short" });
            assert(false, "Should have thrown");
        } catch {
            assert(true, "Throws on weak password");
        }
    });

    // ── Raw Buffer Encryption Tests ──────────────────────────────────────

    await test("encryptBufferRaw: returns Buffer fields", async () => {
        const data = Buffer.from("raw test data");
        const raw = await encryptBufferRaw(data, { password: "test-password-123" });

        assert(Buffer.isBuffer(raw.cipherBytes), "cipherBytes is Buffer");
        assert(Buffer.isBuffer(raw.salt), "salt is Buffer");
        assert(Buffer.isBuffer(raw.iv), "iv is Buffer");
        assert(Buffer.isBuffer(raw.authTag), "authTag is Buffer");
        assert(raw.version === ENCRYPTION_FORMAT_VERSION, "version matches");
    });

    // ── Text Encryption Tests ────────────────────────────────────────────

    await test("encryptText: encrypts a string", async () => {
        const payload = await encryptText("Secret note", "test-password-123");
        assert(payload.cipherText.length > 0, "Produces ciphertext");
        assert(payload.version === ENCRYPTION_FORMAT_VERSION, "Version correct");
    });

    // ── File Encryption Tests ────────────────────────────────────────────

    await test("encryptFile: encrypts a file on disk", async () => {
        const inputPath = path.join(TEMP_DIR, "test-input.txt");
        const outputPath = path.join(TEMP_DIR, "test-input.txt.enc");
        const content = "This is a test file for encryption.\n".repeat(100);

        fs.writeFileSync(inputPath, content);

        const metadata = await encryptFile(inputPath, outputPath, {
            password: "test-password-123",
        });

        assert(fs.existsSync(outputPath), "Encrypted file created");
        assert(metadata.originalFileName === "test-input.txt", "Original filename preserved");
        assert(metadata.mimeType === "text/plain", "MIME type detected");
        assert(metadata.originalSize === Buffer.byteLength(content), "Original size correct");
        assert(metadata.version === ENCRYPTION_FORMAT_VERSION, "Version correct");
        assert(typeof metadata.encryptedAt === "string", "Timestamp present");

        const encryptedContent = fs.readFileSync(outputPath);
        assert(!encryptedContent.equals(Buffer.from(content)), "Content is encrypted");
    });

    await test("encryptFile: rejects non-existent file", async () => {
        try {
            await encryptFile("/nonexistent/file.txt", "/tmp/out.enc", {
                password: "test-password-123",
            });
            assert(false, "Should have thrown");
        } catch {
            assert(true, "Throws on missing file");
        }
    });

    // ── Stream Encryption Tests ──────────────────────────────────────────

    await test("encryptFileStream: encrypts a file via streams", async () => {
        const inputPath = path.join(TEMP_DIR, "stream-input.txt");
        const outputPath = path.join(TEMP_DIR, "stream-input.txt.enc");
        const content = "Stream encryption test data.\n".repeat(500);

        fs.writeFileSync(inputPath, content);

        let progressCalled = false;
        const metadata = await encryptFileStream(
            inputPath,
            outputPath,
            { password: "test-password-123" },
            (_processed, _total) => {
                progressCalled = true;
            },
        );

        assert(fs.existsSync(outputPath), "Encrypted file created");
        assert(progressCalled, "Progress callback was invoked");
        assert(metadata.originalFileName === "stream-input.txt", "Filename preserved");
        assert(metadata.originalSize === Buffer.byteLength(content), "Size correct");
    });

    // ── Utility Tests ────────────────────────────────────────────────────

    await test("generateSalt: produces correct length", async () => {
        const salt = generateSalt();
        assert(salt.length === SALT_LENGTH_BYTES, `Salt is ${SALT_LENGTH_BYTES} bytes`);
    });

    await test("generateIV: produces correct length", async () => {
        const iv = generateIV();
        assert(iv.length === IV_LENGTH_BYTES, `IV is ${IV_LENGTH_BYTES} bytes`);
    });

    await test("toBase64/fromBase64: roundtrip", async () => {
        const original = crypto.randomBytes(32);
        const encoded = toBase64(original);
        const decoded = fromBase64(encoded);
        assert(original.equals(decoded), "Roundtrip successful");
    });

    await test("isValidBase64: validators", async () => {
        assert(isValidBase64(toBase64(Buffer.from("test"))), "Valid base-64 passes");
        assert(!isValidBase64("not-valid-base64!"), "Invalid base-64 fails");
        assert(!isValidBase64(""), "Empty string fails");
    });

    await test("secureWipe: zeros out buffer", async () => {
        const buf = Buffer.from("sensitive data");
        secureWipe(buf);
        assert(buf.every((b) => b === 0), "Buffer is zeroed");
    });

    await test("validatePassword: rejects weak passwords", async () => {
        try {
            validatePassword("");
            assert(false, "Should reject empty");
        } catch {
            assert(true, "Rejects empty password");
        }

        try {
            validatePassword("short");
            assert(false, "Should reject short");
        } catch {
            assert(true, "Rejects short password");
        }
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
