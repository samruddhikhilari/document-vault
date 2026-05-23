"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { encryptFile, decryptFile } from "@/lib/encryption";

interface FileItem {
  fileId: string;
  fileName: string;
  uploadedAt: string;
  length: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [encPassword, setEncPassword] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [decryptPassword, setDecryptPassword] = useState("");
  const [showDecryptModal, setShowDecryptModal] = useState<string | null>(null);
  const [decryptFileName, setDecryptFileName] = useState("");

  const getToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  };

  const fetchFiles = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const res = await fetch("/api/files/list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setFiles(data.files);
      } else if (res.status === 401) {
        localStorage.removeItem("token");
        router.push("/login");
      }
    } catch {
      setError("Failed to load files.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    fetchFiles();
  }, [fetchFiles, router]);

  const handleUpload = async () => {
    if (!selectedFile || !encPassword) {
      setError("Select a file and enter an encryption password.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const buffer = await selectedFile.arrayBuffer();
      const encrypted = await encryptFile(buffer, encPassword);

      const token = getToken();
      const res = await fetch("/api/files/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cipherText: encrypted.cipherText,
          salt: encrypted.salt,
          iv: encrypted.iv,
          fileName: selectedFile.name,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSelectedFile(null);
        setEncPassword("");
        // Reset file input
        const fileInput = document.getElementById(
          "file-input",
        ) as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        await fetchFiles();
      } else {
        setError(data.error || "Upload failed.");
      }
    } catch {
      setError("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileId: string) => {
    setDownloadingId(fileId);
    setError("");
    try {
      const token = getToken();
      const res = await fetch("/api/files/retrieve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fileId }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Retrieve failed.");
        setDownloadingId(null);
        return;
      }

      const plainBuffer = await decryptFile(
        data.cipherText,
        decryptPassword,
        data.salt,
        data.iv,
      );

      const blob = new Blob([plainBuffer]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.fileName || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setShowDecryptModal(null);
      setDecryptPassword("");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Decryption failed.";
      setError(msg);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm("Delete this file permanently?")) return;
    setError("");
    try {
      const token = getToken();
      const res = await fetch("/api/files/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fileId }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchFiles();
      } else {
        setError(data.error || "Delete failed.");
      }
    } catch {
      setError("Delete failed.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">Document Vault</h1>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 space-y-8">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
            <button
              onClick={() => setError("")}
              className="ml-2 font-medium underline"
            >
              dismiss
            </button>
          </div>
        )}

        {/* Upload Section */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Upload File
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select File
              </label>
              <input
                id="file-input"
                type="file"
                onChange={(e) =>
                  setSelectedFile(e.target.files?.[0] ?? null)
                }
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Encryption Password
              </label>
              <input
                type="password"
                value={encPassword}
                onChange={(e) => setEncPassword(e.target.value)}
                placeholder="Enter password to encrypt file"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
              />
            </div>
            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile || !encPassword}
              className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? "Encrypting & Uploading..." : "Upload"}
            </button>
          </div>
        </div>

        {/* Files Table */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Your Files
          </h2>
          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : files.length === 0 ? (
            <p className="text-sm text-gray-500">
              No files uploaded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="pb-3 pr-4 font-medium">Filename</th>
                    <th className="pb-3 pr-4 font-medium">Size</th>
                    <th className="pb-3 pr-4 font-medium">Upload Date</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f) => (
                    <tr
                      key={f.fileId}
                      className="border-b border-gray-100"
                    >
                      <td className="py-3 pr-4 text-gray-900">
                        {f.fileName}
                      </td>
                      <td className="py-3 pr-4 text-gray-600">
                        {formatSize(f.length)}
                      </td>
                      <td className="py-3 pr-4 text-gray-600">
                        {new Date(f.uploadedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 space-x-2">
                        <button
                          onClick={() => {
                            setShowDecryptModal(f.fileId);
                            setDecryptFileName(f.fileName);
                            setDecryptPassword("");
                          }}
                          disabled={downloadingId === f.fileId}
                          className="rounded bg-green-50 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                        >
                          {downloadingId === f.fileId
                            ? "Downloading..."
                            : "Download"}
                        </button>
                        <button
                          onClick={() => handleDelete(f.fileId)}
                          className="rounded bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Decrypt Password Modal */}
      {showDecryptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Decrypt &amp; Download
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {decryptFileName}
            </p>
            <input
              type="password"
              value={decryptPassword}
              onChange={(e) => setDecryptPassword(e.target.value)}
              placeholder="Enter decryption password"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none mb-4"
              onKeyDown={(e) => {
                if (e.key === "Enter" && decryptPassword) {
                  handleDownload(showDecryptModal);
                }
              }}
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowDecryptModal(null);
                  setDecryptPassword("");
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDownload(showDecryptModal)}
                disabled={!decryptPassword || downloadingId !== null}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed"
              >
                {downloadingId ? "Decrypting..." : "Download"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
