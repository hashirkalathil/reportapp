import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebaseAdmin";

export const runtime = "nodejs";

function sanitizeDueDay(value) {
  const day = Number.parseInt(String(value || "15"), 10);
  if (Number.isNaN(day)) return 15;
  return Math.min(31, Math.max(1, day));
}

export async function GET(request) {
  const clientId = request.nextUrl.searchParams.get("clientId");

  if (!clientId) {
    return NextResponse.json({ due: [] });
  }

  try {
    const [formsSnap, reportsSnap] = await Promise.all([
      db.collection("report_forms").where("is_active", "==", true).get(),
      db
        .collection("reports")
        .where("client_id", "==", clientId)
        .get(),
    ]);

    const reportByFormId = new Map();
    reportsSnap.forEach((doc) => {
      const data = doc.data();
      const formId = data.form_id || "";
      const prior = reportByFormId.get(formId);
      // We take the most "advanced" status (submitted takes precedence over draft)
      if (!prior || (prior.status !== "submitted" && data.status === "submitted")) {
        reportByFormId.set(formId, {
          id: doc.id,
          status: data.status || "draft",
          updated_at: data.updated_at || null,
        });
      }
    });

    const due = [];
    formsSnap.forEach((doc) => {
      const data = doc.data();
      const assignedClientIds = Array.isArray(data.assigned_client_ids)
        ? data.assigned_client_ids.map((value) => String(value || "").trim()).filter(Boolean)
        : [];

      const isAssigned =
        assignedClientIds.length === 0 || assignedClientIds.includes(clientId);
      if (!isAssigned) return;

      const report = reportByFormId.get(doc.id);
      const status = report?.status === "submitted" ? "submitted" : "pending";

      due.push({
        id: doc.id,
        name: data.name || "Untitled Form",
        due_day: sanitizeDueDay(data.due_day),
        status,
        report_id: report?.id || null,
      });
    });

    if (due.length === 0) {
      const defaultReport = reportByFormId.get("default") || reportByFormId.get("");
      due.push({
        id: "default",
        name: "Default Monthly Form",
        due_day: 15,
        status: defaultReport?.status === "submitted" ? "submitted" : "pending",
        report_id: defaultReport?.id || null,
      });
    }

    due.sort((a, b) => {
      if (a.status === b.status) return a.due_day - b.due_day;
      return a.status === "pending" ? -1 : 1;
    });

    return NextResponse.json({ due });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
