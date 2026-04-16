import { NextResponse } from "next/server";
import { requireAdminSession } from "../../../../lib/adminAuth";
import { db } from "../../../../lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  await requireAdminSession();

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing report id." }, { status: 400 });
  }

  try {
    const reportDoc = await db.collection("reports").doc(id).get();
    if (!reportDoc.exists) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    const reportData = reportDoc.data();
    
    // Simulate Supabase "clients (name)" join relationship
    let clientName = "Unknown client";
    if (reportData.client_id) {
      const clientDoc = await db.collection("clients").doc(reportData.client_id).get();
      if (clientDoc.exists) {
        clientName = clientDoc.data().name || "Unknown client";
      }
    }

    const data = {
      id: reportDoc.id,
      report_month: reportData.report_month,
      status: reportData.status,
      content: reportData.content,
      updated_at: reportData.updated_at,
      created_at: reportData.created_at,
      clients: {
        name: clientName
      }
    };

    return NextResponse.json({ report: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
