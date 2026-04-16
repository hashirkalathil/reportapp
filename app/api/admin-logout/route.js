import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "../../../lib/adminSession";

export async function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
