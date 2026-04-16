import { NextResponse } from "next/server";
import supabaseAdmin from "../../../lib/supabaseAdmin";

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

  const { data, error } = await supabaseAdmin
    .from("reports")
    .select("id, content, status, updated_at")
    .eq("client_id", clientId)
    .eq("report_month", reportMonth)
    .eq("status", "draft")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ report: data || null });
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

  const { data: existingReport, error: existingError } = await supabaseAdmin
    .from("reports")
    .select("id, content, status, updated_at")
    .eq("client_id", clientId)
    .eq("report_month", reportMonth)
    .eq("status", "draft")
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (existingReport) {
    return NextResponse.json({ report: existingReport });
  }

  const { data, error } = await supabaseAdmin
    .from("reports")
    .insert({
      client_id: clientId,
      report_month: reportMonth,
      content,
      status: "draft",
    })
    .select("id, content, status, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ report: data });
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

  const updatePayload = {
    client_id: clientId,
    report_month: reportMonth,
  };

  if (content !== undefined) {
    updatePayload.content = content;
  }

  if (status) {
    updatePayload.status = status;
  }

  const { data, error } = await supabaseAdmin
    .from("reports")
    .update(updatePayload)
    .eq("id", reportId)
    .select("id, updated_at, status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ report: data });
}
