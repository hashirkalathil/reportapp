import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(request) {
  const clientId = request.nextUrl.searchParams.get("clientId");

  if (!clientId) {
    return NextResponse.json({ months: [] });
  }

  try {
    const snapshot = await db.collection("reports")
      .where("client_id", "==", clientId)
      .get();

    const months = snapshot.docs.map((doc) => ({
      month: doc.data().report_month,
      status: doc.data().status,
    }));

    return NextResponse.json({ months });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
