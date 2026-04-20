'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/firebaseAdmin';
import { assertAdminSession } from '@/lib/adminAuth';
import { normalizeReportFields, DEFAULT_REPORT_FIELDS } from '@/lib/reportFormSchema';

function parseDueDay(value) {
  const day = Number.parseInt(String(value || '15'), 10);
  if (Number.isNaN(day)) return 15;
  return Math.min(31, Math.max(1, day));
}

function parseSchemaJson(rawText) {
  const parsed = JSON.parse(rawText || '[]');
  return normalizeReportFields(parsed);
}

export async function addForm(formData) {
  await assertAdminSession();

  const name = String(formData.get('name') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const dueDay = parseDueDay(formData.get('dueDay'));
  const schemaJson = String(formData.get('schemaJson') || '').trim();
  const clientIds = formData.getAll('clientIds').map((value) => String(value || '').trim()).filter(Boolean);

  if (!name) throw new Error('Form name is required.');

  const fields = schemaJson ? parseSchemaJson(schemaJson) : DEFAULT_REPORT_FIELDS;
  const now = new Date().toISOString();

  await db.collection('report_forms').add({
    name,
    description,
    due_day: dueDay,
    fields,
    assigned_client_ids: clientIds,
    is_active: true,
    created_at: now,
    updated_at: now,
  });

  revalidatePath('/admin/reports');
}

export async function editForm(formData) {
  await assertAdminSession();

  const formId = String(formData.get('formId') || '').trim();
  const name = String(formData.get('name') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const dueDay = parseDueDay(formData.get('dueDay'));
  const schemaJson = String(formData.get('schemaJson') || '').trim();
  const clientIds = formData.getAll('clientIds').map((value) => String(value || '').trim()).filter(Boolean);

  if (!formId) throw new Error('Form ID is required.');
  if (!name) throw new Error('Form name is required.');

  const fields = schemaJson ? parseSchemaJson(schemaJson) : DEFAULT_REPORT_FIELDS;

  await db.collection('report_forms').doc(formId).update({
    name,
    description,
    due_day: dueDay,
    fields,
    assigned_client_ids: clientIds,
    updated_at: new Date().toISOString(),
  });

  revalidatePath('/admin/reports');
  revalidatePath(`/admin/reports/form/${formId}`);
}

export async function deleteForm(formData) {
  await assertAdminSession();

  const formId = String(formData.get('formId') || '').trim();
  if (!formId) throw new Error('Form ID is required.');

  await db.collection('report_forms').doc(formId).delete();
  revalidatePath('/admin/reports');
}

export async function toggleFormStatus(formData) {
  await assertAdminSession();

  const formId = String(formData.get('formId') || '').trim();
  const nextValue = formData.get('nextValue') === 'true';

  if (!formId) throw new Error('Form ID is required.');

  await db.collection('report_forms').doc(formId).update({
    is_active: nextValue,
    updated_at: new Date().toISOString(),
  });

  revalidatePath('/admin/reports');
  revalidatePath(`/admin/reports/form/${formId}`);
}

export async function deleteReportInstance(formData) {
  await assertAdminSession();

  const reportId = String(formData.get('reportId') || '').trim();
  if (!reportId) throw new Error('Report ID is required.');

  await db.collection('reports').doc(reportId).delete();
  
  revalidatePath('/admin');
  revalidatePath('/admin/reports');
  
  redirect('/admin');
}
