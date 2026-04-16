import { revalidatePath } from "next/cache";
import { requireAdminSession, assertAdminSession } from "../../../../lib/adminAuth";
import { db, firebaseAdmin } from "../../../../lib/firebaseAdmin";
import MonthActions from "./MonthActions";

/* ─── Server Actions ──────────────────────────────── */
async function addMonth(formData) {
  "use server";
  await assertAdminSession();
  const label = String(formData.get("label") || "").trim();
  if (!label) throw new Error("Month label is required.");
  
  const now = new Date().toISOString();
  await db.collection("months").add({ label, is_active: true, created_at: now });
  revalidatePath("/admin/months");
}

async function editMonth(formData) {
  "use server";
  await assertAdminSession();
  const monthId = String(formData.get("monthId") || "");
  const label     = String(formData.get("label") || "").trim();
  if (!monthId) throw new Error("Month ID is required.");
  if (!label)     throw new Error("Month label is required.");
  
  await db.collection("months").doc(monthId).update({ label });
  revalidatePath("/admin/months");
}

async function deleteMonth(formData) {
  "use server";
  await assertAdminSession();
  const monthId = String(formData.get("monthId") || "");
  if (!monthId) throw new Error("Month ID is required.");
  
  await db.collection("months").doc(monthId).delete();
  revalidatePath("/admin/months");
}

async function toggleMonthStatus(formData) {
  "use server";
  await assertAdminSession();
  const monthId  = String(formData.get("monthId") || "");
  const nextValue = formData.get("nextValue") === "true";
  if (!monthId) throw new Error("Month ID is required.");
  
  await db.collection("months").doc(monthId).update({ is_active: nextValue });
  revalidatePath("/admin/months");
}

export const metadata = { title: "Reporting Periods — ReportGen Admin" };

/* ─── Avatar ──────────────────────────────────────── */
function Avatar({ label }) {
  const code = String(label).slice(0, 3).toUpperCase();
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-xs font-bold text-orange-500 border border-orange-500/20">
      {code || "?"}
    </div>
  );
}

/* ─── Page ────────────────────────────────────────── */
export default async function AdminMonthsPage() {
  await requireAdminSession();

  let months = [];
  let fetchError = null;

  try {
    const monthsSnap = await db.collection("months").orderBy("created_at", "desc").get();
    monthsSnap.forEach((doc) => {
      months.push({ id: doc.id, ...doc.data() });
    });
  } catch (err) {
    if (err.message.includes("index")) {
      // Fallback if no index exists for created_at yet
      const fallbackSnap = await db.collection("months").get();
      fallbackSnap.forEach((doc) => months.push({ id: doc.id, ...doc.data() }));
      months.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    } else {
      fetchError = err;
    }
  }

  const active   = (months || []).filter((m) => m.is_active).length;
  const inactive = (months || []).filter((m) => !m.is_active).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#5D5FEF]">Configuration</p>
        <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-gray-800">Reporting Periods</h1>
        <p className="mt-1 text-sm text-gray-400">
          Manage customizable periods — add new months, quarters, or specific terms to the reporting dropdown.
        </p>
      </div>

      {/* Quick stats */}
      <div className="mb-5 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {active} Active
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-gray-100 bg-gray-50 px-3.5 py-1.5 text-xs font-semibold text-gray-500">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
          {inactive} Inactive
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#5D5FEF]/20 bg-[#5D5FEF]/5 px-3.5 py-1.5 text-xs font-semibold text-[#5D5FEF]">
          {(months || []).length} Total
        </span>
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">

        {/* ── Add month card ──────────────────────── */}
        <div className="h-fit rounded-2xl bg-white p-5 sm:p-6 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5D5FEF]/10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5D5FEF" strokeWidth="2.2" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
                <path d="M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800">Add New Period</h2>
              <p className="text-xs text-gray-400">Available instantly to writers</p>
            </div>
          </div>

          <form action={addMonth} className="space-y-4">
            <div>
              <label htmlFor="label" className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Period Name
              </label>
              <input
                id="label" name="label" type="text" required maxLength={80}
                placeholder="e.g. Q1 2026 or April 2026"
                className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-300 focus:border-[#5D5FEF]/40 focus:bg-white focus:ring-2 focus:ring-[#5D5FEF]/10"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-[#5D5FEF] py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200/50 transition hover:bg-indigo-600 active:scale-[0.98]"
            >
              Add period
            </button>
          </form>
        </div>

        {/* ── List card ─────────────────────── */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between border-b border-gray-50 px-5 sm:px-6 py-4">
            <div>
              <h2 className="text-sm font-bold text-gray-800">Available Periods</h2>
              <p className="text-xs text-gray-400 mt-0.5">Toggle inactive to hide them from the dropdown</p>
            </div>
          </div>

          {fetchError ? (
            <div className="px-6 py-5">
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-500">
                Failed to load periods: {fetchError.message}
              </div>
            </div>
          ) : months?.length ? (
            <ul className="divide-y divide-gray-50">
              {months.map((month) => (
                <li key={month.id} className="flex flex-col gap-3 px-5 sm:px-6 py-4 transition hover:bg-gray-50/50 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar label={month.label} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-800 text-sm">{month.label}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${month.is_active ? "bg-emerald-400" : "bg-gray-300"}`} />
                        <span className="text-xs text-gray-400">{month.is_active ? "Visible" : "Hidden"}</span>

                        <form action={toggleMonthStatus} className="ml-1">
                          <input type="hidden" name="monthId" value={month.id} />
                          <input type="hidden" name="nextValue" value={month.is_active ? "false" : "true"} />
                          <button type="submit" className="text-[0.65rem] font-semibold text-gray-400 underline-offset-2 hover:underline transition">
                            {month.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>

                  <MonthActions
                    month={month}
                    editAction={editMonth}
                    deleteAction={deleteMonth}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <svg className="h-5 w-5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-400">No periods created yet.</p>
              <p className="text-xs text-gray-300 mt-1">Add your first reporting window using the form.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
