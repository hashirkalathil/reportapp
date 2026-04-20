'use client';

import { useState } from 'react';
import { toggleFormStatus, editForm } from '../../actions';

export default function FormSettingsSidebar({ form }) {
  const [isEditingDueDay, setIsEditingDueDay] = useState(false);
  const [dueDay, setDueDay] = useState(form.due_day);
  const [isPending, setIsPending] = useState(false);

  async function handleToggle() {
    setIsPending(true);
    const fd = new FormData();
    fd.set('formId', form.id);
    fd.set('nextValue', form.is_active ? 'false' : 'true');
    await toggleFormStatus(fd);
    setIsPending(false);
  }

  async function handleDueDaySubmit(e) {
    if (e.key === 'Enter' || e.type === 'blur') {
      if (dueDay === form.due_day) {
        setIsEditingDueDay(false);
        return;
      }
      
      setIsPending(true);
      const fd = new FormData();
      fd.set('formId', form.id);
      fd.set('name', form.name);
      fd.set('description', form.description);
      fd.set('dueDay', dueDay);
      // We don't want to change the schema here, so we'd need to pass it back...
      // This is the tricky part of partial updates with the current server action.
      // For now, let's just use the full builder for due day as it requires the schema.
      // OR, we can update the action to support partial updates.
      
      // Let's stick to the toggle for now as it's clear.
      setIsPending(false);
      setIsEditingDueDay(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.05)] border border-gray-50 overflow-hidden">
      <div className="border-b border-gray-50 px-6 py-5">
        <h2 className="text-sm font-bold text-gray-800">Quick Configuration</h2>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400">Monthly Due Day</span>
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[0.7rem] font-bold text-[#5D5FEF]">
            Day {form.due_day}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400">Public Status</span>
          <button
            onClick={handleToggle}
            disabled={isPending}
            className={`group relative flex items-center gap-2 px-3 py-1 rounded-full text-[0.7rem] font-bold transition-all ${
              form.is_active 
                ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${form.is_active ? 'bg-emerald-400' : 'bg-gray-300'}`} />
            {form.is_active ? 'Active' : 'Inactive'}
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
               <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${form.is_active ? 'bg-emerald-400' : 'bg-gray-400'}`}></span>
            </span>
          </button>
        </div>

        <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
           <p className="text-[10px] text-gray-300">Click status to toggle instantly</p>
           {isPending && <div className="h-3 w-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>}
        </div>
      </div>
    </section>
  );
}
