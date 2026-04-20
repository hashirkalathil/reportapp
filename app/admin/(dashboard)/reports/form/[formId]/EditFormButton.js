'use client';

import { useState } from 'react';
import FormBuilderModal from '@/components/FormBuilderModal';
import { editForm } from '../../actions';

export default function EditFormButton({ form, clients }) {
  const [isOpen, setIsOpen] = useState(false);

  async function handleSave(formData) {
    await editForm(formData);
    setIsOpen(false);
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex-1 md:flex-none inline-flex justify-center items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-gray-800 active:scale-95 shadow-lg shadow-gray-200"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        Edit Template
      </button>

      {isOpen && (
        <FormBuilderModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          initialData={form}
          clients={clients}
          onSave={handleSave}
        />
      )}
    </>
  );
}
