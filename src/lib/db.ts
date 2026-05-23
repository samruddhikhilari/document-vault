/**
 * Database helpers — re-exports from mongodb.ts
 *
 * This module exists as a convenience alias so other parts of the
 * codebase can `import { getDatabase, getGridFSBucket } from "@/lib/db"`.
 */

export { getDatabase, getGridFSBucket, clientPromise } from "./mongodb";
