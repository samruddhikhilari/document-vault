/**
 * POST /api/files/upload
 *
 * Accepts an encrypted payload (JSON) from the client and stores the
 * encrypted binary in MongoDB GridFS. The server NEVER sees plaintext.
 *
 * Request body:
 *   {
 *     cipherText: string (base64-encoded encrypted binary)
 *     salt:       string (base64-encoded 16-byte salt)
 *     iv:         string (base64-encoded 12-byte IV)
 *     fileName:   string (original file name for metadata)
 *   }
 *
 * Response (201):
 *   {
 *     success: true
 *     fileId:  string (GridFS ObjectId as hex string)
 *   }
 *
 * Runtime: Node.js (required for GridFS streaming)
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getGridFSBucket } from "@/lib/mongodb";
import { Readable } from "stream";
import { authenticateRequest } from "@/lib/auth";
import { getFilesCollection } from "@/models/File";

// ─── Request / Response Types ────────────────────────────────────────────────

interface UploadRequestBody {
    cipherText: string;
    salt: string;
    iv: string;
    fileName: string;
}

interface UploadSuccessResponse {
    success: true;
    fileId: string;
}

interface ErrorResponse {
    success: false;
    error: string;
}

// ─── Validation Helpers ──────────────────────────────────────────────────────

function isValidBase64(str: string): boolean {
    if (typeof str !== "string" || str.length === 0) return false;
    try {
        // Attempt round-trip: decode then re-encode
        return btoa(atob(str)) === str;
    } catch {
        return false;
    }
}

function validateUploadBody(
    body: unknown,
): body is UploadRequestBody {
    if (typeof body !== "object" || body === null) return false;
    const obj = body as Record<string, unknown>;
    return (
        typeof obj.cipherText === "string" &&
        typeof obj.salt === "string" &&
        typeof obj.iv === "string" &&
        typeof obj.fileName === "string" &&
        obj.cipherText.length > 0 &&
        obj.salt.length > 0 &&
        obj.iv.length > 0 &&
        obj.fileName.length > 0
    );
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function POST(
    request: NextRequest,
): Promise<NextResponse<UploadSuccessResponse | ErrorResponse>> {
    try {
        // 0. Authenticate
        const user = authenticateRequest(
            request.headers.get("authorization"),
        );
        if (!user) {
            return NextResponse.json(
                { success: false as const, error: "Unauthorized" },
                { status: 401 },
            );
        }

        // 1. Parse the JSON request body
        const body: unknown = await request.json();

        // 2. Validate the payload shape
        if (!validateUploadBody(body)) {
            return NextResponse.json(
                {
                    success: false as const,
                    error:
                        "Invalid request body. Required fields: cipherText, salt, iv, fileName (all non-empty strings).",
                },
                { status: 400 },
            );
        }

        const { cipherText, salt, iv, fileName } = body;

        // 3. Validate base64 encoding of salt and iv
        if (!isValidBase64(salt)) {
            return NextResponse.json(
                { success: false as const, error: "Invalid base64 encoding for salt." },
                { status: 400 },
            );
        }

        if (!isValidBase64(iv)) {
            return NextResponse.json(
                { success: false as const, error: "Invalid base64 encoding for iv." },
                { status: 400 },
            );
        }

        // 4. Convert base64 cipherText to Buffer (the encrypted binary)
        const cipherBuffer: Buffer = Buffer.from(cipherText, "base64");

        if (cipherBuffer.length === 0) {
            return NextResponse.json(
                {
                    success: false as const,
                    error: "cipherText decoded to an empty buffer.",
                },
                { status: 400 },
            );
        }

        // 5. Get the GridFS bucket
        const bucket = await getGridFSBucket();

        // 6. Upload the encrypted binary into GridFS
        //    Store salt and iv in metadata — the server never decrypts.
        const fileId: ObjectId = await new Promise<ObjectId>(
            (resolve, reject) => {
                const uploadStream = bucket.openUploadStream(fileName, {
                    metadata: {
                        salt,
                        iv,
                        originalFileName: fileName,
                        ownerId: user.userId,
                        uploadedAt: new Date().toISOString(),
                    },
                });

                const readable = new Readable();
                readable.push(cipherBuffer);
                readable.push(null); // signal end of stream

                readable
                    .pipe(uploadStream)
                    .on("error", (err: Error) => reject(err))
                    .on("finish", () => resolve(uploadStream.id));
            },
        );

        // 7. Store metadata in the files collection
        const filesCol = await getFilesCollection();
        await filesCol.insertOne({
            filename: fileName,
            ownerId: new ObjectId(user.userId),
            gridfsId: fileId,
            size: cipherBuffer.length,
            iv,
            salt,
            uploadDate: new Date(),
        } as any);

        // 8. Return the fileId to the client
        return NextResponse.json(
            {
                success: true as const,
                fileId: fileId.toHexString(),
            },
            { status: 201 },
        );
    } catch (error: unknown) {
        const message =
            error instanceof Error ? error.message : "Internal server error";

        console.error("[Upload Route] Error:", message);

        return NextResponse.json(
            { success: false as const, error: message },
            { status: 500 },
        );
    }
}
