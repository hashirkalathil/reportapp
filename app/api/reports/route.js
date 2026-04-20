import { NextResponse } from "next/server";
import { db } from "../../../lib/firebaseAdmin";

export const runtime = "nodejs";

function badRequest(message) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function matchesFormId(storedFormId, requestFormId) {
  const normalizedStored = storedFormId || "";
  const normalizedRequest = requestFormId || "";
  if (normalizedRequest === "default") {
    return normalizedStored === "" || normalizedStored === "default";
  }
  return normalizedStored === normalizedRequest;
}

export async function GET(request) {
  const clientId = request.nextUrl.searchParams.get("clientId");
  const formId = request.nextUrl.searchParams.get("formId") || "";

  if (!clientId) {
    return badRequest("Missing clientId.");
  }

  try {
    const snapshot = await db.collection("reports")
      .where("client_id", "==", clientId)
      .where("status", "==", "draft")
      .get();

    const matchingDoc = snapshot.docs.find((doc) => {
      const data = doc.data();
      return matchesFormId(data.form_id, formId);
    });

    if (!matchingDoc) {
      return NextResponse.json({ report: null });
    }

    const data = matchingDoc.data();

    return NextResponse.json({ 
      report: { 
        id: matchingDoc.id, 
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
  const formId = body?.formId || "";
  const content = body?.content ?? {
    type: "doc",
    content: [{ type: "paragraph" }],
  };

  if (!clientId) {
    return badRequest("Missing clientId.");
  }

  try {
    const snapshot = await db.collection("reports")
      .where("client_id", "==", clientId)
      .where("status", "==", "draft")
      .get();

    const matchingDoc = snapshot.docs.find((doc) => {
      const data = doc.data();
      return matchesFormId(data.form_id, formId);
    });

    if (matchingDoc) {
      const data = matchingDoc.data();
      return NextResponse.json({ 
        report: {
          id: matchingDoc.id,
          content: data.content,
          status: data.status,
          updated_at: data.updated_at,
        }
      });
    }

    const now = new Date().toISOString();
    const newDocRef = await db.collection("reports").add({
      client_id: clientId,
      form_id: formId,
      content,
      data: body?.data || {},
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
  const formId = body?.formId || "";
  const content = body?.content;
  const data = body?.data;
  const status = body?.status;

  if (!reportId || !clientId) {
    return badRequest("Missing reportId or clientId.");
  }

  try {
    const now = new Date().toISOString();
    const updatePayload = {
      client_id: clientId,
      form_id: formId,
      updated_at: now
    };

    if (content !== undefined) {
      updatePayload.content = content;
    }

    if (data !== undefined) {
      updatePayload.data = data;
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
