import { db } from "@/lib/firebaseAdmin";
import { requireAdminSession } from "@/lib/adminAuth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { normalizeReportFields } from "@/lib/reportFormSchema";
import { mapTiptapToValues } from "@/lib/reportMapping";
import ReportActions from "./ReportActions";

export const metadata = { title: "Report Details — ReportGen Admin" };

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeStyle: "short" }).format(new Date(value));
}

function StatusBadge({ status }) {
  if (status === "submitted") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Submitted
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      Draft
    </span>
  );
}

export default async function ReportDetailsPage({ params }) {
  await requireAdminSession();
  const { reportId } = await params;

  let report = null;
  let client = null;
  let form = null;

  try {
    const reportDoc = await db.collection("reports").doc(reportId).get();
    if (!reportDoc.exists) notFound();

    report = { id: reportDoc.id, ...reportDoc.data() };

    const [clientDoc, formDoc] = await Promise.all([
      db.collection("clients").doc(report.client_id).get(),
      db.collection("report_forms").doc(report.form_id).get(),
    ]);

    client = clientDoc.exists ? { id: clientDoc.id, ...clientDoc.data() } : { name: "Unknown Client" };
    form = formDoc.exists ? { id: formDoc.id, ...formDoc.data() } : { name: "Default Monthly Form", fields: [] };
  } catch (err) {
    console.error("Error fetching report details:", err);
    notFound();
  }

  const normalizedFields = normalizeReportFields(form.fields);
  
  // Robust data retrieval: use 'data' field, or fallback to reconstructing from 'content'
  const reportData = report.data && Object.keys(report.data).length > 0
    ? report.data 
    : mapTiptapToValues(report.content, normalizedFields);

  function renderValue(val) {
    if (!val) return <span className="text-gray-300 italic">No response</span>;
    if (Array.isArray(val)) {
      if (val.length === 0) return <span className="text-gray-300 italic">No response</span>;
      return (
        <div className="flex flex-wrap gap-2">
          {val.map(v => (
            <span key={v} className="bg-indigo-50 text-[#5D5FEF] px-2 py-0.5 rounded-lg text-xs font-bold border border-indigo-100">
              {v}
            </span>
          ))}
        </div>
      );
    }
    const str = String(val).trim();
    if (!str) return <span className="text-gray-300 italic">No response</span>;
    
    return <p className="whitespace-pre-wrap">{str}</p>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Breadcrumb & Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <nav className="flex items-center gap-2 text-sm font-medium text-gray-400">
          <Link href="/admin" className="hover:text-[#5D5FEF] transition-colors">Dashboard</Link>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          <span className="text-gray-800">Report Details</span>
        </nav>
        <Link 
          href="/admin"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Back to list
        </Link>
      </div>

      {/* Header Card */}
      <div className="mb-8 overflow-hidden rounded-2xl bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.05)] border border-gray-50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
             <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#5D5FEF]/10 text-xl font-bold text-[#5D5FEF]">
                {client.name.slice(0, 2).toUpperCase()}
             </div>
             <div>
                <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
                <p className="text-gray-500 font-medium">{form.name}</p>
                <div className="mt-2 flex items-center gap-3">
                   <StatusBadge status={report.status} />
                   <span className="text-xs text-gray-400 font-medium">Last updated {formatDate(report.updated_at || report.created_at)}</span>
                </div>
             </div>
          </div>
          
          <ReportActions reportId={report.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content: Answers */}
        <div className="lg:col-span-8 space-y-6">
          <section className="rounded-2xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.05)] border border-gray-50 overflow-hidden">
             <div className="border-b border-gray-50 px-6 py-5">
                <h2 className="text-lg font-bold text-gray-800">Report Content</h2>
                <p className="text-xs text-gray-400">Respondent answers and data</p>
             </div>
             <div className="p-6 space-y-8">
                {normalizedFields.map((field) => (
                   <div key={field.id} className="space-y-3">
                      <div className="flex items-start gap-3">
                         <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-[#5D5FEF]">
                            {field.number}
                         </span>
                         <h3 className="text-sm font-bold text-gray-800 pt-0.5">{field.label}</h3>
                         {field.required && <span className="text-[0.6rem] font-bold uppercase text-red-400 bg-red-50 px-1.5 py-0.5 rounded">Required</span>}
                      </div>

                      {field.type === "group" ? (
                         <div className="ml-9 grid gap-4 border-l-2 border-indigo-50 pl-4">
                            {field.children.map((child) => (
                               <div key={child.id} className="space-y-1.5">
                                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{child.label}</p>
                                  <div className="rounded-xl bg-gray-50/50 p-4 text-sm text-gray-700 leading-relaxed border border-gray-100">
                                     {renderValue(reportData?.[child.id])}
                                  </div>
                               </div>
                            ))}
                         </div>
                      ) : (
                         <div className="ml-9">
                            <div className="rounded-xl bg-gray-50/50 p-4 text-sm text-gray-700 leading-relaxed border border-gray-100">
                               {renderValue(reportData?.[field.id])}
                            </div>
                         </div>
                      )}
                   </div>
                ))}
             </div>
          </section>
        </div>

        {/* Sidebar: Settings & Metadata */}
        <div className="lg:col-span-4 space-y-6">
           {/* Settings Card */}
           <section className="rounded-2xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.05)] border border-gray-50 overflow-hidden">
              <div className="border-b border-gray-50 px-6 py-5">
                 <h2 className="text-sm font-bold text-gray-800">Report Settings</h2>
              </div>
              <div className="p-6 space-y-4">
                 <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400">Template</span>
                    <span className="text-xs font-bold text-gray-700">{form.name}</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400">Monthly Due Day</span>
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[0.7rem] font-bold text-[#5D5FEF]">Day {form.due_day}</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400">Form Active</span>
                    <span className={`text-[0.7rem] font-bold ${form.is_active ? 'text-emerald-600' : 'text-gray-400'}`}>
                       {form.is_active ? 'Active' : 'Inactive'}
                    </span>
                 </div>
              </div>
           </section>

           {/* Metadata Card */}
           <section className="rounded-2xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.05)] border border-gray-50 overflow-hidden">
              <div className="border-b border-gray-50 px-6 py-5">
                 <h2 className="text-sm font-bold text-gray-800">Metadata</h2>
              </div>
              <div className="p-6 space-y-4">
                 <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-400 block">Created At</span>
                    <span className="text-xs font-bold text-gray-700 block">{formatDate(report.created_at)}</span>
                 </div>
                 <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-400 block">Report ID</span>
                    <span className="text-[0.65rem] font-mono font-medium text-gray-400 truncate block">{report.id}</span>
                 </div>
                 <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-400 block">Client ID</span>
                    <span className="text-[0.65rem] font-mono font-medium text-gray-400 truncate block">{report.client_id}</span>
                 </div>
              </div>
           </section>

           {/* Quick Actions */}
           <div className="rounded-2xl bg-[#5D5FEF]/5 border border-[#5D5FEF]/10 p-6">
              <h3 className="text-sm font-bold text-[#5D5FEF] mb-2">Need to edit data?</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-4">
                 Currently, reports can only be edited by the client. Admins can view and export finalized reports.
              </p>
              <button className="w-full rounded-xl bg-white py-2.5 text-xs font-bold text-[#5D5FEF] border border-[#5D5FEF]/20 hover:bg-white/80 transition">
                 Share with client
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
