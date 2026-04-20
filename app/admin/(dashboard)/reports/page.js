import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { requireAdminSession, assertAdminSession } from '@/lib/adminAuth';
import { db } from '@/lib/firebaseAdmin';
import FormActions from './FormActions';
import AddFormWrapper from './AddFormWrapper';
import {
  DEFAULT_REPORT_FIELDS,
  normalizeReportFields,
} from '@/lib/reportFormSchema';

function parseClientIds(value) {
  if (Array.isArray(value)) {
    return value.map((id) => String(id || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  }
  return [];
}

function parseSchemaJson(rawText) {
  const parsed = JSON.parse(rawText || '[]');
  return normalizeReportFields(parsed);
}

function parseDueDay(value) {
  const day = Number.parseInt(String(value || '15'), 10);
  if (Number.isNaN(day)) return 15;
  return Math.min(31, Math.max(1, day));
}

import { 
  addForm, 
  editForm, 
  deleteForm, 
  toggleFormStatus 
} from './actions';

export const metadata = { title: 'Report Forms - ReportGen Admin' };

function FormAvatar({ label }) {
  const code = String(label).slice(0, 3).toUpperCase();
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-xs font-bold text-orange-500 border border-orange-500/20">
      {code || '?'}
    </div>
  );
}

function defaultSchemaText() {
  return JSON.stringify(DEFAULT_REPORT_FIELDS, null, 2);
}

export default async function AdminReportsPage() {
  await requireAdminSession();

  let forms = [];
  let clients = [];
  let fetchError = null;

  try {
    const [formsSnap, clientsSnap] = await Promise.all([
      db.collection('report_forms').orderBy('created_at', 'desc').get(),
      db.collection('clients').orderBy('name', 'asc').get(),
    ]);

    forms = formsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || 'Untitled Form',
        description: data.description || '',
        due_day: parseDueDay(data.due_day),
        fields: normalizeReportFields(data.fields || DEFAULT_REPORT_FIELDS),
        assigned_client_ids: parseClientIds(data.assigned_client_ids),
        is_active: data.is_active !== false,
        created_at: data.created_at || null,
      };
    });

    clients = clientsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    fetchError = err;
  }

  const active = forms.filter((form) => form.is_active).length;
  const inactive = forms.filter((form) => !form.is_active).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#5D5FEF]">Configuration</p>
        <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-gray-800">Report Forms</h1>
      </div>

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
          {forms.length} Total
        </span>
      </div>

      <div className="grid gap-4 sm:gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <AddFormWrapper clients={clients} addAction={addForm} />

        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between border-b border-gray-50 px-5 sm:px-6 py-4">
            <div>
              <h2 className="text-sm font-bold text-gray-800">Configured Forms</h2>
            </div>
          </div>

          {fetchError ? (
            <div className="px-6 py-5">
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-500">
                Failed to load forms: {fetchError.message}
              </div>
            </div>
          ) : forms.length ? (
            <ul className="divide-y divide-gray-50">
              {forms.map((form) => (
                <li key={form.id} className="flex flex-col gap-3 px-5 sm:px-6 py-4 transition hover:bg-gray-50/50">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <Link href={`/admin/reports/form/${form.id}`} className="group/form flex items-center gap-3 min-w-0">
                        <FormAvatar label={form.name} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-800 text-sm group-hover/form:text-[#5D5FEF] transition-colors">{form.name}</p>
                          <p className="truncate text-xs text-gray-400">{form.description || 'No description'}</p>
                          <div className="mt-1 flex items-center gap-2 text-[0.68rem]">
                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-semibold text-[#5D5FEF]">
                              Due day {form.due_day}
                            </span>
                            <span className={form.is_active ? 'text-emerald-600 font-semibold' : 'text-gray-400 font-semibold'}>
                              {form.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <span className="text-gray-400">{form.fields.length} sections</span>
                          </div>
                        </div>
                      </Link>
                    </div>

                    <div className="flex items-center gap-2">
                      <form action={toggleFormStatus}>
                        <input type="hidden" name="formId" value={form.id} />
                        <input type="hidden" name="nextValue" value={form.is_active ? 'false' : 'true'} />
                        <button
                          type="submit"
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
                        >
                          {form.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </form>

                      <FormActions
                        form={form}
                        clients={clients}
                        editAction={editForm}
                        deleteAction={deleteForm}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <svg className="h-5 w-5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 6h16M4 12h16M4 18h10" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-400">No report forms yet.</p>
              <p className="text-xs text-gray-300 mt-1">Create your first form using the panel on the left.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
