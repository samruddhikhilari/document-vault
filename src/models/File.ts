import { ObjectId, Collection } from "mongodb";
import { getDatabase } from "@/lib/mongodb";

export interface FileDocument {
  _id: ObjectId;
  filename: string;
  ownerId: ObjectId;
  gridfsId: ObjectId;
  size: number;
  iv: string;
  salt: string;
  uploadDate: Date;
}

export async function getFilesCollection(): Promise<Collection<FileDocument>> {
  const db = await getDatabase();
  const col = db.collection<FileDocument>("files");
  await col.createIndex({ ownerId: 1 });
  return col;
}
