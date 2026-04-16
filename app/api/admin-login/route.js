import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_MS,
  ADMIN_SESSION_TTL_SECONDS,
  createSessionPayload,
  createSessionTokenValue,
} from "../../../lib/adminSession";

function constantTimeEquals(leftValue, rightValue) {
  const leftHash = createHash("sha256").update(String(leftValue ?? "")).digest();
  const rightHash = createHash("sha256")
    .update(String(rightValue ?? ""))
    .digest();

  return timingSafeEqual(leftHash, rightHash);
}

function signSessionPayload(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export async function POST(request) {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.SESSION_SECRET;

  if (!adminUsername || !adminPassword || !sessionSecret) {
    return NextResponse.json(
      { error: "Admin authentication is not configured." },
      { status: 500 }
    );
  }

  let credentials;

  try {
    credentials = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const username = credentials?.username ?? "";
  const password = credentials?.password ?? "";

  const isValidUsername = constantTimeEquals(username, adminUsername);
  const isValidPassword = constantTimeEquals(password, adminPassword);

  if (!isValidUsername || !isValidPassword) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 }
    );
  }

  const issuedAt = Date.now();
  const payload = createSessionPayload(adminUsername, issuedAt);
  const signature = signSessionPayload(payload, sessionSecret);
  const sessionToken = createSessionTokenValue(
    adminUsername,
    issuedAt,
    signature
  );

  const response = NextResponse.json({ success: true });

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: sessionToken,
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
    expires: new Date(issuedAt + ADMIN_SESSION_TTL_MS),
  });

  return response;
}
