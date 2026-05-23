/**
 * GET /api/files/list
 *
 * Lists all encrypted files stored in GridFS.
 * Returns metadata only — no decrypted content.
 *
 * Runtime: Node.js (required for GridFS)
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { authenticateRequest } from "@/lib/auth";
import { getFilesCollection } from "@/models/File";

interface FileListItem {
    fileId: string;
    fileName: string;
    uploadedAt: string;
    length: number;
}

interface SuccessResponse {
    success: true;
    files: FileListItem[];
}

interface ErrorResponse {
    success: false;
    error: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
    try {
        const user = authenticateRequest(
            request.headers.get("authorization"),
        );
        if (!user) {
            return NextResponse.json(
                { success: false as const, error: "Unauthorized" },
                { status: 401 },
            );
        }

        const filesCol = await getFilesCollection();
        const documents = await filesCol
            .find({ ownerId: new ObjectId(user.userId) })
            .sort({ uploadDate: -1 })
            .toArray();

        const files: FileListItem[] = documents.map((doc) => ({
            fileId: doc.gridfsId.toHexString(),
            fileName: doc.filename ?? "unknown",
            uploadedAt: doc.uploadDate?.toISOString() ?? "",
            length: doc.size ?? 0,
        }));

        return NextResponse.json(
            { success: true as const, files },
            { status: 200 },
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal server error";
        console.error("[List Route] Error:", message);
        return NextResponse.json(
            { success: false as const, error: message },
            { status: 500 },
        );
    }
}
