import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(request) {
  const clientId = request.nextUrl.searchParams.get("clientId");

  if (!clientId) {
    return NextResponse.json({ forms: [] });
  }

  try {
    const snapshot = await db.collection("reports")
      .where("client_id", "==", clientId)
      .get();

    const forms = snapshot.docs.map((doc) => ({
      formId: doc.data().form_id,
      status: doc.data().status,
    }));

    return NextResponse.json({ forms });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
