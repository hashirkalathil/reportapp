import { NextResponse } from "next/server";
import { db } from "../../../lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const snapshot = await db.collection("clients")
      .where("is_active", "==", true)
      .get();
      
    const clients = snapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
      is_active: doc.data().is_active
    }));

    clients.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ clients });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
