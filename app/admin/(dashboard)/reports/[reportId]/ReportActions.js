'use client';

import { useState } from 'react';
import { deleteReportInstance } from '../actions';

export default function ReportActions({ reportId }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExport = () => {
    window.location.href = `/api/export-pdf?reportId=${reportId}`;
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const formData = new FormData();
      formData.append('reportId', reportId);
      await deleteReportInstance(formData);
    } catch (error) {
      console.error('Failed to delete report:', error);
      alert('Delete failed. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3">
      <button 
        onClick={handleExport}
        className="flex-1 md:flex-none inline-flex justify-center items-center gap-2 rounded-xl bg-[#5D5FEF] px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-600 shadow-xl shadow-indigo-100 active:scale-95"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Export PDF
      </button>

      <button 
        onClick={handleDelete}
        disabled={isDeleting}
        className="flex-1 md:flex-none inline-flex justify-center items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-6 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100 active:scale-95 disabled:opacity-50"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
        {isDeleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  );
}
