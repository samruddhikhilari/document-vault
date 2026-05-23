# Encryption Module

AES-256-GCM authenticated encryption with PBKDF2-SHA256 key derivation.  
Uses **Node.js built-in `crypto` module** — zero third-party dependencies.

---

## Architecture

```
Password ──→ PBKDF2(SHA-256, 150k iterations) ──→ AES-256 Key
                       ↑                               ↓
                  Random Salt                     AES-256-GCM
                                               ↑          ↓
                                           Random IV   Ciphertext
                                                       + Auth Tag

Output: { cipherText, salt, iv, authTag, version }
```

## Security Properties

| Property | Detail |
|----------|--------|
| Algorithm | AES-256-GCM (authenticated encryption) |
| Key Derivation | PBKDF2-SHA256, 150,000 iterations |
| Key Size | 256 bits (32 bytes) |
| Salt | 16 bytes (128-bit), random per encryption |
| IV | 12 bytes (96-bit per NIST), random per encryption |
| Auth Tag | 16 bytes (128-bit GCM tag) |
| Integrity | Ciphertext + auth tag ensures tamper detection |

## File Structure

```
encryption/
├── index.ts        # Public API — re-exports everything
├── encrypt.ts      # Core encryption functions
├── key.ts          # PBKDF2 key derivation
├── utils.ts        # Base-64, hex, validation, secure wipe
├── types.ts        # TypeScript interfaces and types
├── constants.ts    # Cryptographic constants/config
└── README.md       # This file
```

## API Reference

### `encryptBuffer(data, options)` → `EncryptedPayload`
Encrypt any buffer (Buffer, ArrayBuffer, Uint8Array, or string) to a base-64 encoded payload.

```ts
import { encryptBuffer } from "../encryption";

const fileData = fs.readFileSync("document.pdf");
const encrypted = await encryptBuffer(fileData, { password: "my-secret-password" });

// encrypted = {
//   cipherText: "base64...",
//   salt: "base64...",
//   iv: "base64...",
//   authTag: "base64...",
//   version: 1
// }
```

### `encryptBufferRaw(data, options)` → `EncryptedPayloadRaw`
Same as `encryptBuffer` but returns raw `Buffer` fields (no base-64 encoding). More efficient for server-side pipelines.

```ts
const encrypted = await encryptBufferRaw(fileData, { password: "my-secret" });
// encrypted.cipherBytes: Buffer
// encrypted.salt: Buffer
// encrypted.iv: Buffer
// encrypted.authTag: Buffer
```

### `encryptFile(inputPath, outputPath, options)` → `EncryptionMetadata`
Encrypt a file from disk and write the encrypted output to a new file.

```ts
import { encryptFile } from "../encryption";

const metadata = await encryptFile(
    "path/to/document.pdf",
    "path/to/document.pdf.enc",
    { password: "my-secret" }
);

// Save metadata to DB for decryption later:
// metadata = { salt, iv, authTag, originalFileName, mimeType, originalSize, version, encryptedAt }
```

### `encryptFileStream(inputPath, outputPath, options, onProgress?)` → `EncryptionMetadata`
Stream-based encryption for large files. Uses constant memory.

```ts
import { encryptFileStream } from "../encryption";

const metadata = await encryptFileStream(
    "path/to/large-video.mp4",
    "path/to/large-video.mp4.enc",
    { password: "my-secret" },
    (processed, total) => {
        console.log(`${((processed / total!) * 100).toFixed(1)}%`);
    }
);
```

### `encryptText(text, password)` → `EncryptedPayload`
Convenience wrapper for encrypting strings.

```ts
const encrypted = await encryptText("my secret note", "my-password");
```

### `deriveKey(password, salt?)` → `DerivedKeyResult`
Derive a 256-bit AES key from a password using PBKDF2.

```ts
const { key, salt } = await deriveKey("my-password");
// key: 32-byte Buffer
// salt: 16-byte Buffer (random, save for decryption)
```

## Types

| Type | Description |
|------|-------------|
| `EncryptedPayload` | Base-64 encoded encryption output |
| `EncryptedPayloadRaw` | Raw Buffer encryption output |
| `EncryptionMetadata` | File metadata for DB storage |
| `EncryptBufferOptions` | Options for buffer encryption |
| `EncryptFileOptions` | Options for file encryption |
| `DerivedKeyResult` | Key derivation result |
| `ProgressCallback` | Progress reporting callback |

## Important Notes

- The **password must NEVER be stored** or transmitted — it exists only in the user's memory/browser.
- The **salt, IV, and authTag are NOT secret** — they must be stored alongside the ciphertext for decryption.
- Each encryption generates a **fresh random salt and IV**, so encrypting the same data twice produces different ciphertext.
- Changing constants after production deployment will make previously encrypted files **permanently unreadable**.
