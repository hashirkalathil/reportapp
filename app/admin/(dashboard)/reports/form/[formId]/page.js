import { db } from "@/lib/firebaseAdmin";
import { requireAdminSession } from "@/lib/adminAuth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { normalizeReportFields } from "@/lib/reportFormSchema";
import EditFormButton from "./EditFormButton";
import FormSettingsSidebar from "./FormSettingsSidebar";
import QuickQuestionAdder from "./QuickQuestionAdder";
import { toggleFormStatus, editForm } from "../../actions";

export const metadata = { title: "Form Template Details — ReportGen Admin" };

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeStyle: "short" }).format(new Date(value));
}

function ActiveBadge({ active }) {
  if (active) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-500">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
      Inactive
    </span>
  );
}

export default async function FormDetailsPage({ params }) {
  await requireAdminSession();
  const { formId } = await params;

  let form = null;
  let assignedClients = [];

  try {
    const formDoc = await db.collection("report_forms").doc(formId).get();
    if (!formDoc.exists) notFound();

    form = { id: formDoc.id, ...formDoc.data() };

    const clientIds = form.assigned_client_ids || [];
    if (clientIds.length > 0) {
      const clientsSnap = await db.collection("clients").where("__name__", "in", clientIds).get();
      assignedClients = clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  } catch (err) {
    console.error("Error fetching form template details:", err);
    notFound();
  }

  const normalizedFields = normalizeReportFields(form.fields);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Breadcrumb & Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <nav className="flex items-center gap-2 text-sm font-medium text-gray-400">
          <Link href="/admin/reports" className="hover:text-[#5D5FEF] transition-colors">Report Forms</Link>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          <span className="text-gray-800">Form Details</span>
        </nav>
        <Link 
          href="/admin/reports"
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
             <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-xl font-bold text-orange-500">
                {form.name.slice(0, 2).toUpperCase()}
             </div>
             <div>
                <h1 className="text-2xl font-bold text-gray-900">{form.name}</h1>
                <p className="text-gray-500 font-medium">{form.description || 'No description provided'}</p>
                <div className="mt-2 flex items-center gap-3">
                   <ActiveBadge active={form.is_active} />
                   <span className="text-xs text-gray-400 font-medium">Last updated {formatDate(form.updated_at || form.created_at)}</span>
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
             <EditFormButton form={form} clients={assignedClients.map(c => ({id: c.id, name: c.name}))} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content: Question Schema */}
        <div className="lg:col-span-8 space-y-6">
          <section className="rounded-2xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.05)] border border-gray-50 overflow-hidden">
             <div className="border-b border-gray-50 px-6 py-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Question Schema</h2>
                  <p className="text-xs text-gray-400">Structural definition of the report form</p>
                </div>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-[#5D5FEF]">
                   {normalizedFields.length} Sections
                </span>
             </div>
             <div className="p-6 space-y-8">
                {normalizedFields.map((field) => (
                   <div key={field.id} className="space-y-3">
                      <div className="flex items-start gap-3">
                         <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-[#5D5FEF]">
                            {field.number}
                         </span>
                         <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between">
                               <h3 className="text-sm font-bold text-gray-800 pt-0.5">{field.label}</h3>
                            </div>
                            <div className="mt-1 flex items-center gap-3">
                               <span className="text-[0.65rem] font-bold uppercase text-gray-400">Type: {field.type}</span>
                               {field.required && <span className="text-[0.6rem] font-bold uppercase text-red-400 bg-red-50 px-1.5 py-0.5 rounded">Required</span>}
                            </div>
                         </div>
                      </div>

                      {field.type === "group" ? (
                         <div className="ml-9 grid gap-3 border-l-2 border-indigo-50 pl-4">
                            {field.children.map((child, j) => (
                               <div key={child.id} className="flex items-center gap-3 rounded-xl bg-gray-50/50 p-3 border border-gray-100">
                                  <span className="text-[0.65rem] font-bold text-gray-300">{String.fromCharCode(97 + j)}.</span>
                                  <p className="text-xs font-bold text-gray-600">{child.label}</p>
                               </div>
                            ))}
                         </div>
                      ) : (
                         <div className="ml-9">
                            <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center">
                               <p className="text-[0.7rem] font-medium text-gray-300 italic">User input area ({field.type})</p>
                            </div>
                         </div>
                      )}
                      
                      {field.options && field.options.length > 0 && (
                         <div className="ml-9 flex flex-wrap gap-2 mt-2">
                            {field.options.map(opt => (
                               <span key={opt} className="rounded-lg bg-amber-50 px-2 py-1 text-[0.65rem] font-bold text-amber-600 border border-amber-100">
                                  {opt}
                               </span>
                            ))}
                         </div>
                      )}
                   </div>
                ))}

                {/* Less-Click: Inline Adder */}
                <QuickQuestionAdder form={form} />
             </div>
          </section>
        </div>

        {/* Sidebar: Config & Clients */}
         <div className="lg:col-span-4 space-y-6">
            <FormSettingsSidebar form={form} />

           {/* Assigned Clients */}
           <section className="rounded-2xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.05)] border border-gray-50 overflow-hidden">
              <div className="border-b border-gray-50 px-6 py-5 flex items-center justify-between">
                 <h2 className="text-sm font-bold text-gray-800">Assigned Clients</h2>
                 <span className="text-[0.65rem] font-bold text-gray-400">{assignedClients.length} Total</span>
              </div>
              <div className="p-6 space-y-3">
                 {assignedClients.map(client => (
                    <div key={client.id} className="flex items-center gap-3 rounded-xl border border-gray-50 p-2.5 transition hover:bg-gray-50">
                       <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-[0.65rem] font-black text-[#5D5FEF]">
                          {client.name.slice(0, 2).toUpperCase()}
                       </div>
                       <span className="text-xs font-bold text-gray-700 truncate">{client.name}</span>
                    </div>
                 ))}
                 {assignedClients.length === 0 && (
                    <div className="py-4 text-center">
                       <p className="text-xs text-gray-300 italic">No clients assigned yet</p>
                    </div>
                 )}
              </div>
           </section>

           {/* Metadata Card */}
           <section className="rounded-2xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.05)] border border-gray-50 overflow-hidden">
              <div className="p-6 space-y-4">
                 <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-400 block">Created At</span>
                    <span className="text-xs font-bold text-gray-700 block">{formatDate(form.created_at)}</span>
                 </div>
                 <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-400 block">Form ID</span>
                    <span className="text-[0.65rem] font-mono font-medium text-gray-400 truncate block">{form.id}</span>
                 </div>
              </div>
           </section>
        </div>
      </div>
    </div>
  );
}
