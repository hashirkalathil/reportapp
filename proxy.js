import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_MS,
  createSessionPayload,
  parseSessionToken,
} from "./lib/adminSession";

const encoder = new TextEncoder();

function isProtectedAdminRoute(pathname) {
  return pathname.startsWith("/admin") && pathname !== "/admin/login";
}

function isProtectedExportRoute(pathname) {
  return pathname.startsWith("/api/export-");
}

function hexToBytes(hex) {
  if (!hex || hex.length % 2 !== 0) {
    return null;
  }

  const bytes = new Uint8Array(hex.length / 2);

  for (let index = 0; index < hex.length; index += 2) {
    const byte = Number.parseInt(hex.slice(index, index + 2), 16);

    if (Number.isNaN(byte)) {
      return null;
    }

    bytes[index / 2] = byte;
  }

  return bytes;
}

async function verifyAdminSession(token) {
  const sessionSecret = process.env.SESSION_SECRET;
  const adminUsername = process.env.ADMIN_USERNAME;

  if (!sessionSecret || !adminUsername || !token) {
    return false;
  }

  const parsedToken = parseSessionToken(token);

  if (!parsedToken) {
    return false;
  }

  if (parsedToken.username !== adminUsername) {
    return false;
  }

  if (Date.now() - parsedToken.timestamp > ADMIN_SESSION_TTL_MS) {
    return false;
  }

  const signatureBytes = hexToBytes(parsedToken.signature);

  if (!signatureBytes) {
    return false;
  }

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(sessionSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  return crypto.subtle.verify(
    "HMAC",
    cryptoKey,
    signatureBytes,
    encoder.encode(
      createSessionPayload(parsedToken.username, parsedToken.timestamp)
    )
  );
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  if (!isProtectedAdminRoute(pathname) && !isProtectedExportRoute(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const isValidSession = await verifyAdminSession(sessionCookie);

  if (isValidSession) {
    return NextResponse.next();
  }

  if (isProtectedExportRoute(pathname)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
