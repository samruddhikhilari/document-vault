import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "";

if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET environment variable.");
}

const SALT_ROUNDS = 12;

export interface JwtPayload {
  userId: string;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

/**
 * Extract and verify the JWT from an Authorization header.
 * Returns the payload or null if invalid/missing.
 */
export function authenticateRequest(
  authHeader: string | null,
): JwtPayload | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    return verifyToken(authHeader.slice(7));
  } catch {
    return null;
  }
}
