'use client';

import { useState, useCallback } from "react";
import Link from "next/link";
import ReportPreviewModal from "./ReportPreviewModal";

/* ── helpers ────────────────────────── */
const STATUS_LABELS = { all: "All Statuses", draft: "Draft", submitted: "Submitted" };

function getNextSort(curr, key) {
  if (curr.key !== key) return { key, direction: "asc" };
  return { key, direction: curr.direction === "asc" ? "desc" : "asc" };
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

/* ── sub-components ─────────────────── */
function SortButton({ label, sortKey, currentSort, onSort }) {
  const isActive = currentSort.key === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={[
        "inline-flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-[0.08em] transition-colors",
        isActive ? "text-[#5D5FEF]" : "text-gray-400 hover:text-gray-600",
      ].join(" ")}
    >
      {label}
      <span className="text-[0.6rem]">
        {isActive ? (currentSort.direction === "asc" ? "↑" : "↓") : <span className="opacity-40">↕</span>}
      </span>
    </button>
  );
}

function StatusBadge({ status }) {
  if (status === "submitted") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[0.68rem] font-semibold text-emerald-600">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Submitted
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[0.68rem] font-semibold text-amber-600">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      Draft
    </span>
  );
}

function ClientAvatar({ name }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5D5FEF]/10 text-[0.7rem] font-bold text-[#5D5FEF]">
      {initials || "?"}
    </div>
  );
}

/* ── main ───────────────────────────── */
export default function DashboardTable({ reports, deleteReportAction }) {
  const [sort, setSort] = useState({ key: "updatedAt", direction: "desc" });
  const [statusFilter, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [previewReport, setPreview] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const q = search.trim().toLowerCase();

  const filtered = reports
    .filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (q && !r.clientName.toLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) => {
      const av = String(a[sort.key] ?? "").toLowerCase();
      const bv = String(b[sort.key] ?? "").toLowerCase();
      const c = av.localeCompare(bv);
      return sort.direction === "asc" ? c : -c;
    });

  const handleSort = useCallback((key) => setSort((s) => getNextSort(s, key)), []);
  const openPreview = useCallback((r) => setPreview({ id: r.id, clientName: r.clientName }), []);
  const closePreview = useCallback(() => setPreview(null), []);

  async function handleDelete(report) {
    if (!window.confirm(`Are you sure you want to delete the report for ${report.clientName} (${report.formName})?`)) return;
    setDeletingId(report.id);
    try {
      await deleteReportAction(report.id);
    } catch (err) {
      alert("Failed to delete report: " + err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {/* Table card */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.05)]">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-50 px-6 py-4">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search" value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search client…"
                aria-label="Search by client name"
                className="h-9 w-52 rounded-xl border border-gray-100 bg-gray-50 pl-8 pr-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-300 focus:border-[#5D5FEF]/40 focus:bg-white focus:ring-2 focus:ring-[#5D5FEF]/10"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatus(e.target.value)}
              aria-label="Filter by status"
              className="h-9 rounded-xl border border-gray-100 bg-gray-50 px-3 text-sm text-gray-600 outline-none transition focus:border-[#5D5FEF]/40 focus:ring-2 focus:ring-[#5D5FEF]/10"
            >
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <span className="text-xs text-gray-400">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                <th className="px-6 py-3.5 text-left">
                  <SortButton label="Client" sortKey="clientName" currentSort={sort} onSort={handleSort} />
                </th>
                <th className="px-6 py-3.5 text-left">
                  <SortButton label="Form" sortKey="formName" currentSort={sort} onSort={handleSort} />
                </th>
                <th className="px-6 py-3.5 text-left">
                  <SortButton label="Status" sortKey="status" currentSort={sort} onSort={handleSort} />
                </th>
                <th className="px-6 py-3.5 text-left">
                  <SortButton label="Last Updated" sortKey="updatedAt" currentSort={sort} onSort={handleSort} />
                </th>
                <th className="px-6 py-3.5 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {filtered.length > 0 ? (
                filtered.map((report) => (
                  <tr key={report.id} className="group transition-colors hover:bg-gray-50/60">
                    <td className="px-6 py-4">
                      <Link href={`/admin/reports/${report.id}`} className="flex items-center gap-3 group/link">
                        <ClientAvatar name={report.clientName} />
                        <span className="font-semibold text-gray-800 group-hover/link:text-[#5D5FEF] transition-colors">{report.clientName}</span>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-medium">{report.formName}</td>
                    <td className="px-6 py-4"><StatusBadge status={report.status} /></td>
                    <td className="px-6 py-4 text-xs tabular-nums text-gray-400">{formatDate(report.updatedAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/reports/${report.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#5D5FEF]/20 bg-[#5D5FEF]/5 px-3.5 py-1.5 text-xs font-semibold text-[#5D5FEF] transition hover:border-[#5D5FEF]/40 hover:bg-[#5D5FEF]/10"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                          </svg>
                          View Detail
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(report)}
                          disabled={deletingId === report.id}
                          aria-label={`Delete report for ${report.clientName}`}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg border border-red-100 bg-red-50 text-red-500 transition hover:border-red-200 hover:bg-red-100 disabled:opacity-50"
                        >
                          {deletingId === report.id ? (
                            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                          ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                      <svg className="h-5 w-5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-400">No reports match your filters.</p>
                    {(search || statusFilter !== "all") && (
                      <button
                        type="button"
                        onClick={() => { setSearch(""); setStatus("all"); }}
                        className="mt-2 text-xs font-semibold text-[#5D5FEF] hover:underline transition"
                      >
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Modal */}
      {previewReport && (
        <ReportPreviewModal
          reportId={previewReport.id}
          clientName={previewReport.clientName}
          onClose={closePreview}
        />
      )}
    </>
  );
}
