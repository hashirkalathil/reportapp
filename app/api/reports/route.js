import { NextResponse } from "next/server";
import { db } from "../../../lib/firebaseAdmin";

export const runtime = "nodejs";

function badRequest(message) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request) {
  const clientId = request.nextUrl.searchParams.get("clientId");
  const reportMonth = request.nextUrl.searchParams.get("reportMonth");

  if (!clientId || !reportMonth) {
    return badRequest("Missing clientId or reportMonth.");
  }

  try {
    const snapshot = await db.collection("reports")
      .where("client_id", "==", clientId)
      .where("report_month", "==", reportMonth)
      .where("status", "==", "draft")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ report: null });
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    return NextResponse.json({ 
      report: { 
        id: doc.id, 
        content: data.content, 
        status: data.status, 
        updated_at: data.updated_at 
      } 
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const clientId = body?.clientId;
  const reportMonth = body?.reportMonth;
  const content = body?.content ?? {
    type: "doc",
    content: [{ type: "paragraph" }],
  };

  if (!clientId || !reportMonth) {
    return badRequest("Missing clientId or reportMonth.");
  }

  try {
    const snapshot = await db.collection("reports")
      .where("client_id", "==", clientId)
      .where("report_month", "==", reportMonth)
      .where("status", "==", "draft")
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      return NextResponse.json({ 
        report: { id: doc.id, content: data.content, status: data.status, updated_at: data.updated_at } 
      });
    }

    const now = new Date().toISOString();
    const newDocRef = await db.collection("reports").add({
      client_id: clientId,
      report_month: reportMonth,
      content,
      status: "draft",
      created_at: now,
      updated_at: now
    });

    return NextResponse.json({ 
      report: { id: newDocRef.id, content, status: "draft", updated_at: now } 
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const reportId = body?.reportId;
  const clientId = body?.clientId;
  const reportMonth = body?.reportMonth;
  const content = body?.content;
  const status = body?.status;

  if (!reportId || !clientId || !reportMonth) {
    return badRequest("Missing reportId, clientId, or reportMonth.");
  }

  try {
    const now = new Date().toISOString();
    const updatePayload = {
      client_id: clientId,
      report_month: reportMonth,
      updated_at: now
    };

    if (content !== undefined) {
      updatePayload.content = content;
    }

    if (status) {
      updatePayload.status = status;
    }

    await db.collection("reports").doc(reportId).update(updatePayload);

    return NextResponse.json({ 
      report: { id: reportId, updated_at: now, status: status || "draft" } 
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
