# Decryption Module

AES-256-GCM authenticated decryption with PBKDF2-SHA256 key derivation.  
Uses **Node.js built-in `crypto` module** — zero third-party dependencies.

---

## Architecture

```
Password ──→ PBKDF2(SHA-256, 150k iterations) ──→ AES-256 Key
                       ↑                               ↓
                  Stored Salt                     AES-256-GCM
                                            ↑     ↑        ↓
                                        Stored  Stored   Plaintext
                                          IV    AuthTag

Input:  { cipherText, salt, iv, authTag, version }
Output: plaintext Buffer
```

## Error Handling

The decryption module provides structured error handling via `DecryptionError`:

| Error Code | Meaning |
|------------|---------|
| `WRONG_PASSWORD` | Password is incorrect (GCM auth tag mismatch) |
| `INTEGRITY_CHECK_FAILED` | Ciphertext has been tampered with |
| `INVALID_FORMAT` | Encrypted data format is corrupt |
| `UNSUPPORTED_VERSION` | Encryption version not supported |
| `MISSING_FIELDS` | Required fields are missing from payload |
| `FILE_ERROR` | File not found or permission denied |
| `UNKNOWN` | Unexpected error |

```ts
import { decryptBuffer, DecryptionError, DecryptionErrorCode } from "../decryption";

try {
    const result = await decryptBuffer(payload, { password: "wrong-password" });
} catch (err) {
    if (err instanceof DecryptionError) {
        switch (err.code) {
            case DecryptionErrorCode.WRONG_PASSWORD:
                console.error("Incorrect password!");
                break;
            case DecryptionErrorCode.INVALID_FORMAT:
                console.error("Data is corrupted!");
                break;
        }
    }
}
```

## File Structure

```
decryption/
├── index.ts        # Public API — re-exports everything
├── decrypt.ts      # Core decryption functions
├── key.ts          # PBKDF2 key re-derivation
├── utils.ts        # Base-64, validation, secure wipe
├── types.ts        # TypeScript interfaces, error types
├── constants.ts    # Cryptographic constants (must match encryption)
└── README.md       # This file
```

## API Reference

### `decryptBuffer(payload, options)` → `DecryptionResult`
Decrypt a base-64 encoded `EncryptedPayload` back to plaintext.

```ts
import { decryptBuffer } from "../decryption";

const result = await decryptBuffer(
    {
        cipherText: "base64...",
        salt: "base64...",
        iv: "base64...",
        authTag: "base64...",
        version: 1,
    },
    { password: "my-secret-password" }
);

// result.data: Buffer (plaintext)
// result.verified: true (integrity check passed)
```

### `decryptBufferRaw(payload, options)` → `DecryptionResult`
Decrypt raw Buffer-based encrypted data (no base-64 overhead).

```ts
const result = await decryptBufferRaw(
    { cipherBytes, salt, iv, authTag, version: 1 },
    { password: "my-secret" }
);
```

### `decryptFile(inputPath, outputPath, metadata, options)` → `DecryptFileResult`
Decrypt an encrypted file from disk using stored metadata.

```ts
import { decryptFile } from "../decryption";

const result = await decryptFile(
    "path/to/document.pdf.enc",
    "path/to/document.pdf",
    metadata, // { salt, iv, authTag, originalFileName, ... }
    { password: "my-secret" }
);

// result = {
//   outputPath: "path/to/document.pdf",
//   originalFileName: "document.pdf",
//   mimeType: "application/pdf",
//   size: 1234567,
//   verified: true
// }
```

### `decryptFileStream(inputPath, outputPath, metadata, options, onProgress?)` → `DecryptFileResult`
Stream-based decryption for large files. Uses constant memory.

```ts
import { decryptFileStream } from "../decryption";

const result = await decryptFileStream(
    "path/to/large-video.mp4.enc",
    "path/to/large-video.mp4",
    metadata,
    { password: "my-secret" },
    (processed, total) => {
        console.log(`${((processed / total!) * 100).toFixed(1)}%`);
    }
);
```

### `decryptText(payload, password)` → `string`
Convenience wrapper for decrypting strings.

```ts
const plaintext = await decryptText(encryptedPayload, "my-password");
console.log(plaintext); // "my secret note"
```

### `validatePayload(payload)` → `void`
Validate an encrypted payload before attempting decryption. Throws `DecryptionError` if invalid.

```ts
import { validatePayload } from "../decryption";

validatePayload(payload); // throws if malformed
```

## Types

| Type | Description |
|------|-------------|
| `EncryptedPayload` | Base-64 encoded encrypted data |
| `EncryptedPayloadRaw` | Raw Buffer encrypted data |
| `EncryptionMetadata` | File metadata from DB |
| `DecryptBufferOptions` | Options for buffer decryption |
| `DecryptFileOptions` | Options for file decryption |
| `DecryptionResult` | Result of buffer decryption |
| `DecryptFileResult` | Result of file decryption |
| `DecryptionError` | Custom error class with error codes |
| `DecryptionErrorCode` | Enum of error codes |

## Important Notes

- The **password is the only secret** — salt, IV, and authTag are non-secret and stored in the DB.
- GCM authentication ensures both **confidentiality** (data is secret) and **integrity** (data hasn't been tampered).
- If the wrong password is provided, the GCM auth tag verification fails and **no plaintext is returned**.
- Constants in this module **must match** the encryption module's constants exactly.
