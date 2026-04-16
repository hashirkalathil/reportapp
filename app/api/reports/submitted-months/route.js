import { NextResponse } from "next/server";
import supabaseAdmin from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET(request) {
  const clientId = request.nextUrl.searchParams.get("clientId");

  if (!clientId) {
    return NextResponse.json({ months: [] });
  }

  const { data, error } = await supabaseAdmin
    .from("reports")
    .select("report_month, status")
    .eq("client_id", clientId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const months = (data || []).map((r) => ({
    month: r.report_month,
    status: r.status,
  }));

  return NextResponse.json({ months });
}
