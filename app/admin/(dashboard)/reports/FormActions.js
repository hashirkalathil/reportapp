'use client';

import { useMemo, useState } from 'react';
import FormBuilderModal from '@/components/FormBuilderModal';

function normalizeFields(schema) {
  if (!Array.isArray(schema)) return [];
  return schema;
}

export default function FormActions({ form, clients, editAction, deleteAction }) {
  const [editing, setEditing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');



  const selectedClientNames = useMemo(() => {
    const map = new Map(clients.map((client) => [client.id, client.name]));
    const formClients = form.assigned_client_ids || [];
    if (!formClients.length) return ['All clients'];
    return formClients.map((id) => map.get(id) || 'Unknown client');
  }, [clients, form.assigned_client_ids]);

  // toggleClient safely removed

  async function handleEdit(fd) {
    setPending(true);
    setError('');
    try {
      await editAction(fd);
      setEditing(false);
    } catch (err) {
      setError(err.message || 'Failed to update form.');
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete \"${form.name}\"? This cannot be undone.`)) return;

    setDeleting(true);
    setError('');

    try {
      const fd = new FormData();
      fd.set('formId', form.id);
      await deleteAction(fd);
    } catch (err) {
      setError(err.message || 'Failed to delete form.');
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <FormBuilderModal
        isOpen={editing}
        onClose={() => setEditing(false)}
        initialData={form}
        clients={clients}
        onSave={handleEdit}
      />
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
        >
          Preview
        </button>

        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#5D5FEF]/20 bg-[#5D5FEF]/5 px-3 text-xs font-semibold text-[#5D5FEF] transition hover:border-[#5D5FEF]/40 hover:bg-[#5D5FEF]/10"
        >
          Edit
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-3 text-xs font-semibold text-red-500 transition hover:border-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>

      {error && <p className="mt-1 text-xs text-red-500 w-full">{error}</p>}

      {previewOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/35 p-4"
          onMouseDown={() => setPreviewOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-[0_24px_60px_rgba(0,0,0,0.15)]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-[#5D5FEF]">Form Preview</p>
                <h3 className="mt-1 text-lg font-bold text-gray-800">{form.name}</h3>
                <p className="text-sm text-gray-400">Due day {form.due_day || 15}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                x
              </button>
            </div>

            <p className="mb-3 text-xs font-semibold text-gray-500">Assigned: {selectedClientNames.join(', ')}</p>

            <div className="max-h-[50vh] space-y-3 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50/60 p-3">
              {Array.isArray(form.fields) && form.fields.length ? (
                form.fields.map((field) => (
                  <div key={field.id} className="rounded-xl border border-gray-100 bg-white px-3 py-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-700">{field.label}</p>
                    <p className="mt-0.5 text-[0.7rem] text-gray-400">{field.type}</p>
                    {field.type === 'group' && Array.isArray(field.children) && (
                      <ul className="mt-1 space-y-1">
                        {field.children.map((child) => (
                          <li key={child.id} className="text-xs text-gray-500">- {child.label}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400">No fields configured.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
