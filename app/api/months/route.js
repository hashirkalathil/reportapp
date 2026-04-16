import { NextResponse } from "next/server";
import { db } from "../../../lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const snapshot = await db.collection("months")
      .where("is_active", "==", true)
      .get();
      
    const months = snapshot.docs.map((doc) => ({
      id: doc.id,
      label: doc.data().label,
      created_at: doc.data().created_at
    }));

    // In-memory sort by created_at descending (newest configurations at the top)
    months.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return NextResponse.json({ months: months.map(m => m.label) });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
