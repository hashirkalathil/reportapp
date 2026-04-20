'use client';

import { useState } from 'react';
import FormBuilderModal from '@/components/FormBuilderModal';

export default function AddFormWrapper({ clients, addAction }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="h-fit rounded-2xl bg-white p-5 sm:p-6 shadow-[0_2px_16px_rgba(0,0,0,0.06)] border border-[#5D5FEF]/10">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5D5FEF]/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5D5FEF" strokeWidth="2.2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h10" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-800">Add Report Form</h2>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(true)}
          className="w-full inline-flex justify-center items-center gap-2 rounded-xl bg-[#5D5FEF] py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200/50 transition hover:bg-indigo-600 active:scale-[0.98]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Build New Form
        </button>
      </div>

      {isOpen && (
        <FormBuilderModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          clients={clients}
          onSave={addAction}
        />
      )}
    </>
  );
}
