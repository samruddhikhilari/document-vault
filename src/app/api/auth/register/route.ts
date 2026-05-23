export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { hashPassword, generateToken } from "@/lib/auth";
import { getUsersCollection } from "@/models/User";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (
      !name ||
      !email ||
      !password ||
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return NextResponse.json(
        { success: false, error: "Name, email, and password are required." },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters." },
        { status: 400 },
      );
    }

    const users = await getUsersCollection();

    const existing = await users.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Email already registered." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);

    const result = await users.insertOne({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      createdAt: new Date(),
    } as any);

    const token = generateToken({
      userId: result.insertedId.toHexString(),
      email: email.toLowerCase().trim(),
    });

    return NextResponse.json(
      { success: true, token, userId: result.insertedId.toHexString() },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("[Register] Error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
