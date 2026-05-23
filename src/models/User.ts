import { ObjectId, Collection } from "mongodb";
import { getDatabase } from "@/lib/mongodb";

export interface UserDocument {
  _id: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export async function getUsersCollection(): Promise<Collection<UserDocument>> {
  const db = await getDatabase();
  const col = db.collection<UserDocument>("users");
  // Ensure unique email index (idempotent)
  await col.createIndex({ email: 1 }, { unique: true });
  return col;
}
