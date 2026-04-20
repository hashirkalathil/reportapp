import { NextResponse } from "next/server";
import { db } from "../../../lib/firebaseAdmin";
import { requireAdminSession } from "../../../lib/adminAuth";
import {
  DEFAULT_REPORT_FIELDS,
  normalizeReportFields,
} from "../../../lib/reportFormSchema";

export const runtime = "nodejs";

function parseAssignedClientIds(value) {
  if (Array.isArray(value)) {
    return value.map((id) => String(id || "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  }

  return [];
}

function sanitizeDueDay(value) {
  const day = Number.parseInt(String(value || "15"), 10);
  if (Number.isNaN(day)) return 15;
  return Math.min(31, Math.max(1, day));
}

function toClientSafe(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name || "Untitled Form",
    description: data.description || "",
    due_day: sanitizeDueDay(data.due_day),
    is_active: data.is_active !== false,
    assigned_client_ids: parseAssignedClientIds(data.assigned_client_ids),
    fields: normalizeReportFields(data.fields || DEFAULT_REPORT_FIELDS),
    created_at: data.created_at || null,
    updated_at: data.updated_at || null,
  };
}

function defaultForm() {
  return {
    id: "default",
    name: "Default Monthly Form",
    description: "System default template",
    due_day: 15,
    is_active: true,
    assigned_client_ids: [],
    fields: DEFAULT_REPORT_FIELDS,
    created_at: null,
    updated_at: null,
  };
}

export async function GET(request) {
  const clientId = request.nextUrl.searchParams.get("clientId");

  try {
    const snapshot = await db.collection("report_forms").get();
    let forms = snapshot.docs.map(toClientSafe);

    if (clientId) {
      forms = forms.filter((form) => {
        const assigned = form.assigned_client_ids || [];
        const matchesClient = assigned.includes(clientId);
        const globalForm = assigned.length === 0;
        return form.is_active && (matchesClient || globalForm);
      });

      if (forms.length === 0) {
        forms = [defaultForm()];
      }

      forms.sort((a, b) => String(a.name).localeCompare(String(b.name)));
      return NextResponse.json({ forms });
    }

    await requireAdminSession();

    forms.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return NextResponse.json({ forms });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
