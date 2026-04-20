import DashboardTable from "@/components/DashboardTable";
import { requireAdminSession, assertAdminSession } from "@/lib/adminAuth";
import { db } from "@/lib/firebaseAdmin";
import { revalidatePath } from "next/cache";

export const metadata = { title: "Dashboard — ReportGen Admin" };

function normalizeReports(reports, clientsMap, formsMap) {
  return (reports || []).map((r) => ({
    id: r.id,
    clientName: clientsMap[r.client_id] || "Unknown client",
    formName: formsMap[r.form_id] || "Default Monthly Form",
    status: r.status || "draft",
    updatedAt: r.updated_at || r.created_at || null,
  }));
}

export default async function AdminDashboardPage() {
  await requireAdminSession();

  async function deleteReport(reportId) {
    "use server";
    await assertAdminSession();
    if (!reportId) throw new Error("Report ID missing.");
    await db.collection("reports").doc(reportId).delete();
    revalidatePath("/admin");
  }

  let normalized = [];
  let fetchError = null;

  try {
    const [clientsSnap, formsSnap, reportsSnap] = await Promise.all([
      db.collection("clients").get(),
      db.collection("report_forms").get(),
      db.collection("reports").orderBy("updated_at", "desc").get()
    ]);

    const clientsMap = {};
    clientsSnap.forEach((doc) => {
      clientsMap[doc.id] = doc.data().name;
    });

    const formsMap = {};
    formsSnap.forEach((doc) => {
      formsMap[doc.id] = doc.data().name;
    });

    const rawReports = [];
    reportsSnap.forEach((doc) => {
      rawReports.push({ id: doc.id, ...doc.data() });
    });

    normalized = normalizeReports(rawReports, clientsMap, formsMap);
  } catch (err) {
    fetchError = err;
  }

  const activeReports = normalized.filter((r) => r.status === "submitted");
  const draftReports  = normalized.filter((r) => r.status === "draft");

  const totalDraft      = draftReports.length;
  const totalSubmitted  = activeReports.length;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5D5FEF]">Overview</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-800">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-400">
          View, filter, and export generated reports across all clients.
        </p>
      </div>

      {/* Big stat cards row */}
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl bg-[#5D5FEF] p-6 text-white shadow-lg shadow-indigo-200/50">
          <svg className="absolute right-0 top-0 h-24 w-40 opacity-20" viewBox="0 0 160 96" fill="none">
            <path d="M0 72 C40 72 40 24 80 24 C120 24 120 60 160 48" stroke="white" strokeWidth="3" fill="none"/>
          </svg>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200">Total Reports</p>
          <p className="mt-3 text-5xl font-bold leading-none">{normalized.length}</p>
          <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-white">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="18 15 12 9 6 15"/></svg>
            All time
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.05)]">
          <div className="flex items-start justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Submitted</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          </div>
          <p className="mt-4 text-4xl font-bold text-gray-800">{totalSubmitted}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[0.65rem] font-semibold text-emerald-600">Finalized</span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.05)]">
          <div className="flex items-start justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Drafts</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </div>
          </div>
          <p className="mt-4 text-4xl font-bold text-gray-800">{totalDraft}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[0.65rem] font-semibold text-amber-600">In progress</span>
          </div>
        </div>
      </div>

      {fetchError && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-500">
          <strong className="font-semibold">Error loading reports:</strong> {fetchError.message}
        </div>
      )}

      {/* Tables section */}
      <div className="space-y-12">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Active Reports</h2>
              <p className="text-xs text-gray-400">Finalized and submitted reports ready for review.</p>
            </div>
          </div>
          <DashboardTable reports={activeReports} deleteReportAction={deleteReport} />
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Draft Reports</h2>
              <p className="text-xs text-gray-400">In-progress reports that haven't been finalized yet.</p>
            </div>
          </div>
          <DashboardTable reports={draftReports} deleteReportAction={deleteReport} />
        </section>
      </div>
    </div>
  );
}
