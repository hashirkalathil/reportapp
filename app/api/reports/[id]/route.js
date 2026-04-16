import { NextResponse } from "next/server";
import { requireAdminSession } from "../../../../lib/adminAuth";
import supabaseAdmin from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  await requireAdminSession();

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing report id." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("reports")
    .select(
      `
        id,
        report_month,
        status,
        content,
        updated_at,
        created_at,
        clients (
          name
        )
      `
    )
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  return NextResponse.json({ report: data });
}
