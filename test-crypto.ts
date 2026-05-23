import fs from "fs";
import path from "path";
import { encryptText, encryptBuffer, encryptFile, encryptFileStream } from "./src/utils/encryption/encrypt";
import { decryptText, decryptBuffer, decryptFile, decryptFileStream } from "./src/utils/decryption/decrypt";
import { DecryptionError } from "./src/utils/decryption/types";

const PASSWORD = "test-password-123!";
const TEST_DIR = path.join(__dirname, "test-output");

async function main() {
    // Clean up test directory
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });

    console.log("=== Document Vault Encryption Tests ===\n");

    // ── Test 1: Text Encryption/Decryption ──
    console.log("1. Text Encryption/Decryption");
    try {
        const original = "Hello, this is a secret message! 🔐";
        const encrypted = await encryptText(original, PASSWORD);
        console.log("   Encrypted payload:", JSON.stringify(encrypted, null, 2).substring(0, 100) + "...");

        const decrypted = await decryptText(encrypted, PASSWORD);
        console.log("   Decrypted:", decrypted);
        console.log("   Match:", original === decrypted ? "✅ PASS" : "❌ FAIL");
    } catch (err) {
        console.error("   ❌ FAIL:", err);
    }

    // ── Test 2: Wrong Password ──
    console.log("\n2. Wrong Password Detection");
    try {
        const encrypted = await encryptText("secret", PASSWORD);
        await decryptText(encrypted, "wrong-password");
        console.log("   ❌ FAIL: Should have thrown an error");
    } catch (err) {
        if (err instanceof DecryptionError) {
            console.log(`   ✅ PASS: Correctly rejected (${err.code}): ${err.message}`);
        } else {
            console.error("   ❌ FAIL: Unexpected error:", err);
        }
    }

    // ── Test 3: Tampering Detection ──
    console.log("\n3. Tampering Detection");
    try {
        const encrypted = await encryptText("important data", PASSWORD);
        // Tamper with the ciphertext
        const tampered = { ...encrypted, cipherText: encrypted.cipherText.slice(0, -4) + "AAAA" };
        await decryptText(tampered, PASSWORD);
        console.log("   ❌ FAIL: Should have thrown an error");
    } catch (err) {
        if (err instanceof DecryptionError) {
            console.log(`   ✅ PASS: Tampering detected (${err.code}): ${err.message}`);
        } else {
            console.error("   ❌ FAIL: Unexpected error:", err);
        }
    }

    // ── Test 4: Buffer Encryption/Decryption ──
    console.log("\n4. Buffer Encryption/Decryption");
    try {
        const originalBuffer = Buffer.from([0x00, 0x01, 0x02, 0xFF, 0xFE, 0xFD]);
        const encrypted = await encryptBuffer(originalBuffer, { password: PASSWORD });
        const result = await decryptBuffer(encrypted, { password: PASSWORD });
        const match = Buffer.compare(originalBuffer, result.data) === 0;
        console.log("   Verified:", result.verified);
        console.log("   Match:", match ? "✅ PASS" : "❌ FAIL");
    } catch (err) {
        console.error("   ❌ FAIL:", err);
    }

    // ── Test 5: File Encryption/Decryption ──
    console.log("\n5. File Encryption/Decryption");
    try {
        // Create a test file
        const testFilePath = path.join(TEST_DIR, "test-document.txt");
        const encryptedFilePath = path.join(TEST_DIR, "test-document.txt.enc");
        const decryptedFilePath = path.join(TEST_DIR, "test-document-decrypted.txt");

        const fileContent = "This is a test document for file encryption.\nLine 2.\nLine 3.";
        fs.writeFileSync(testFilePath, fileContent, "utf-8");

        // Encrypt the file
        const metadata = await encryptFile(testFilePath, encryptedFilePath, { password: PASSWORD });
        console.log("   Metadata:", {
            originalFileName: metadata.originalFileName,
            mimeType: metadata.mimeType,
            originalSize: metadata.originalSize,
            version: metadata.version,
        });

        // Decrypt the file
        const result = await decryptFile(encryptedFilePath, decryptedFilePath, metadata, { password: PASSWORD });
        console.log("   Decrypted size:", result.size, "bytes");
        console.log("   Verified:", result.verified);

        // Compare contents
        const decryptedContent = fs.readFileSync(decryptedFilePath, "utf-8");
        console.log("   Match:", fileContent === decryptedContent ? "✅ PASS" : "❌ FAIL");
    } catch (err) {
        console.error("   ❌ FAIL:", err);
    }

    // ── Test 6: Stream File Encryption/Decryption ──
    console.log("\n6. Stream File Encryption/Decryption (large file simulation)");
    try {
        const testFilePath = path.join(TEST_DIR, "large-file.bin");
        const encryptedFilePath = path.join(TEST_DIR, "large-file.bin.enc");
        const decryptedFilePath = path.join(TEST_DIR, "large-file-decrypted.bin");

        // Create a ~1 MB test file with random data
        const randomData = Buffer.alloc(1024 * 1024);
        for (let i = 0; i < randomData.length; i++) {
            randomData[i] = Math.floor(Math.random() * 256);
        }
        fs.writeFileSync(testFilePath, randomData);

        // Encrypt with streams
        const metadata = await encryptFileStream(
            testFilePath,
            encryptedFilePath,
            { password: PASSWORD },
            (processed, total) => {
                // Uncomment for progress: console.log(`   Encrypting: ${((processed / total!) * 100).toFixed(0)}%`);
            },
        );

        // Decrypt with streams
        const result = await decryptFileStream(
            encryptedFilePath,
            decryptedFilePath,
            metadata,
            { password: PASSWORD },
            (processed, total) => {
                // Uncomment for progress: console.log(`   Decrypting: ${((processed / total!) * 100).toFixed(0)}%`);
            },
        );

        console.log("   Original size:", randomData.length, "bytes");
        console.log("   Decrypted size:", result.size, "bytes");

        const decryptedData = fs.readFileSync(decryptedFilePath);
        const match = Buffer.compare(randomData, decryptedData) === 0;
        console.log("   Match:", match ? "✅ PASS" : "❌ FAIL");
    } catch (err) {
        console.error("   ❌ FAIL:", err);
    }

    // ── Test 7: Unique Encryption Per Call ──
    console.log("\n7. Unique Ciphertext Per Encryption (same plaintext + password)");
    try {
        const enc1 = await encryptText("same message", PASSWORD);
        const enc2 = await encryptText("same message", PASSWORD);
        const different = enc1.cipherText !== enc2.cipherText && enc1.salt !== enc2.salt && enc1.iv !== enc2.iv;
        console.log("   Ciphertexts differ:", different ? "✅ PASS" : "❌ FAIL");

        // Both should decrypt to the same plaintext
        const dec1 = await decryptText(enc1, PASSWORD);
        const dec2 = await decryptText(enc2, PASSWORD);
        console.log("   Both decrypt correctly:", (dec1 === "same message" && dec2 === "same message") ? "✅ PASS" : "❌ FAIL");
    } catch (err) {
        console.error("   ❌ FAIL:", err);
    }

    // ── Cleanup ──
    console.log("\n=== All tests complete ===");
    console.log(`Test files are in: ${TEST_DIR}`);
}

main().catch(console.error);