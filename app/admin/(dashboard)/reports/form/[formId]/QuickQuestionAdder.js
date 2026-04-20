'use client';

import { useState } from 'react';
import { editForm } from '../../actions';

export default function QuickQuestionAdder({ form }) {
  const [label, setLabel] = useState('');
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!label.trim()) return;

    setIsPending(true);
    try {
      const newField = {
        id: label.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "") || `field_${Date.now()}`,
        label: label.trim(),
        type: 'textarea',
        required: false,
        number: (form.fields?.length || 0) + 1,
      };

      const updatedFields = [...(form.fields || []), newField];

      const fd = new FormData();
      fd.set('formId', form.id);
      fd.set('name', form.name);
      fd.set('description', form.description);
      fd.set('dueDay', form.due_day);
      fd.set('schemaJson', JSON.stringify(updatedFields));
      (form.assigned_client_ids || []).forEach(id => fd.append('clientIds', id));

      await editForm(fd);
      setLabel('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="mt-8 border-t border-dashed border-gray-100 pt-8">
      <form onSubmit={handleSubmit} className="relative max-w-lg">
        <label className="text-[0.65rem] font-bold uppercase tracking-widest text-[#5D5FEF] mb-3 block">
           Quick Add Question
        </label>
        <div className="group relative flex items-center">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            disabled={isPending}
            placeholder="Type a question and hit Enter..."
            className="w-full rounded-2xl border border-gray-100 bg-gray-50/50 px-5 py-4 text-sm font-medium text-gray-800 outline-none transition-all focus:border-[#5D5FEF]/30 focus:bg-white focus:ring-4 focus:ring-[#5D5FEF]/5"
          />
          <button
            type="submit"
            disabled={isPending || !label.trim()}
            className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#5D5FEF] text-white shadow-lg shadow-indigo-100 transition active:scale-95 disabled:opacity-0"
          >
            {isPending ? (
               <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
