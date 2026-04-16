import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_MS,
  createSessionPayload,
  parseSessionToken,
} from "./adminSession";

function timingSafeHexEquals(leftHex, rightHex) {
  const leftBuffer = Buffer.from(leftHex, "hex");
  const rightBuffer = Buffer.from(rightHex, "hex");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export async function hasValidAdminSession() {
  const sessionSecret = process.env.SESSION_SECRET;
  const adminUsername = process.env.ADMIN_USERNAME;

  if (!sessionSecret || !adminUsername) {
    return false;
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const parsedToken = parseSessionToken(sessionToken);

  if (!parsedToken) {
    return false;
  }

  if (parsedToken.username !== adminUsername) {
    return false;
  }

  if (Date.now() - parsedToken.timestamp > ADMIN_SESSION_TTL_MS) {
    return false;
  }

  const expectedSignature = createHmac("sha256", sessionSecret)
    .update(createSessionPayload(parsedToken.username, parsedToken.timestamp))
    .digest("hex");

  return timingSafeHexEquals(parsedToken.signature, expectedSignature);
}

export async function requireAdminSession() {
  const isValid = await hasValidAdminSession();

  if (!isValid) {
    redirect("/admin/login");
  }
}

export async function assertAdminSession() {
  const isValid = await hasValidAdminSession();

  if (!isValid) {
    throw new Error("Unauthorized");
  }
}
