export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { comparePassword, generateToken } from "@/lib/auth";
import { getUsersCollection } from "@/models/User";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body as {
      email?: string;
      password?: string;
    };

    if (
      !email ||
      !password ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 },
      );
    }

    const users = await getUsersCollection();
    const user = await users.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const token = generateToken({
      userId: user._id.toHexString(),
      email: user.email,
    });

    return NextResponse.json(
      { success: true, token, userId: user._id.toHexString() },
      { status: 200 },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("[Login] Error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
