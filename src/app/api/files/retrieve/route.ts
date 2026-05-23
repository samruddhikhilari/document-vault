/**
 * POST /api/files/retrieve
 *
 * Accepts a fileId, fetches the encrypted binary from GridFS,
 * and returns the encrypted payload (base64) along with salt/iv
 * for client-side decryption.
 *
 * Request body:
 *   {
 *     fileId: string (GridFS ObjectId as hex string)
 *   }
 *
 * Response (200):
 *   {
 *     success:    true
 *     cipherText: string (base64)
 *     salt:       string (base64)
 *     iv:         string (base64)
 *     fileName:   string (original file name)
 *   }
 *
 * Runtime: Node.js (required for GridFS streaming)
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getGridFSBucket, getDatabase } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { getFilesCollection } from "@/models/File";

// ─── Response Types ──────────────────────────────────────────────────────────

interface RetrieveSuccessResponse {
    success: true;
    cipherText: string;
    salt: string;
    iv: string;
    fileName: string;
}

interface ErrorResponse {
    success: false;
    error: string;
}

// ─── Request Type ────────────────────────────────────────────────────────────

interface RetrieveRequestBody {
    fileId: string;
}

// ─── Validation ──────────────────────────────────────────────────────────────

function isValidObjectId(id: string): boolean {
    return typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);
}

// ─── GridFS Metadata Type ────────────────────────────────────────────────────

interface GridFSFileMetadata {
    salt: string;
    iv: string;
    originalFileName: string;
    uploadedAt: string;
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function POST(
    request: NextRequest,
): Promise<NextResponse<RetrieveSuccessResponse | ErrorResponse>> {
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

        // 1. Parse the JSON body
        const body: unknown = await request.json();

        if (
            typeof body !== "object" ||
            body === null ||
            typeof (body as RetrieveRequestBody).fileId !== "string"
        ) {
            return NextResponse.json(
                {
                    success: false as const,
                    error: "Invalid request body. Required field: fileId (string).",
                },
                { status: 400 },
            );
        }

        const { fileId } = body as RetrieveRequestBody;

        // 2. Validate ObjectId format
        if (!isValidObjectId(fileId)) {
            return NextResponse.json(
                {
                    success: false as const,
                    error: "Invalid fileId format. Must be a 24-character hex string.",
                },
                { status: 400 },
            );
        }

        const objectId = new ObjectId(fileId);

        // 3. Verify ownership via files collection
        const filesCol = await getFilesCollection();
        const fileMeta = await filesCol.findOne({
            gridfsId: objectId,
            ownerId: new ObjectId(user.userId),
        });
        if (!fileMeta) {
            return NextResponse.json(
                { success: false as const, error: "File not found." },
                { status: 404 },
            );
        }

        // 3b. Look up the GridFS file document for streaming
        const db = await getDatabase();
        const filesCollection = db.collection("encryptedFiles.files");
        const fileDoc = await filesCollection.findOne({ _id: objectId });

        if (!fileDoc) {
            return NextResponse.json(
                {
                    success: false as const,
                    error: "File not found.",
                },
                { status: 404 },
            );
        }

        // 4. Extract metadata
        const metadata = fileDoc.metadata as GridFSFileMetadata;

        if (!metadata || !metadata.salt || !metadata.iv) {
            return NextResponse.json(
                {
                    success: false as const,
                    error:
                        "File metadata is missing or corrupt (salt/iv not found).",
                },
                { status: 500 },
            );
        }

        // 5. Stream the encrypted binary from GridFS into a buffer
        const bucket = await getGridFSBucket();
        const downloadStream = bucket.openDownloadStream(objectId);

        const chunks: Buffer[] = [];
        const cipherBuffer: Buffer = await new Promise<Buffer>(
            (resolve, reject) => {
                downloadStream.on("data", (chunk: Buffer) => {
                    chunks.push(chunk);
                });
                downloadStream.on("error", (err: Error) => reject(err));
                downloadStream.on("end", () => {
                    resolve(Buffer.concat(chunks));
                });
            },
        );

        // 6. Encode the encrypted binary as base64 for transport
        const cipherText: string = cipherBuffer.toString("base64");

        // 7. Return the encrypted payload — the server never decrypts
        return NextResponse.json(
            {
                success: true as const,
                cipherText,
                salt: metadata.salt,
                iv: metadata.iv,
                fileName: metadata.originalFileName ?? fileDoc.filename ?? "unknown",
            },
            { status: 200 },
        );
    } catch (error: unknown) {
        const message =
            error instanceof Error ? error.message : "Internal server error";

        console.error("[Retrieve Route] Error:", message);

        return NextResponse.json(
            { success: false as const, error: message },
            { status: 500 },
        );
    }
}
