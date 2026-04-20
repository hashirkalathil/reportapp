'use client';

import React from 'react';

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
);

const LoaderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);

export default function EditorWorkspace({ 
  children, 
  status = 'draft', 
  isSaving = false, 
  lastSaved, 
  clientName,
  onChangeSelection
}) {
  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 flex min-h-16 flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-white/90 px-4 sm:px-6 py-2 backdrop-blur-md">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900 line-clamp-1">{clientName || 'Untitled'}</span>
          </div>
          <button 
            onClick={onChangeSelection}
            className="text-[10px] uppercase tracking-[0.2em] text-gray-400 transition-colors hover:text-[#5D5FEF] font-bold ml-1 sm:ml-2 shrink-0"
          >
            Change
          </button>
        </div>

        <div className="flex items-center gap-3 sm:gap-6 ml-auto">
          {/* Status Badge */}
          <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-gray-100 bg-gray-50/50 px-2.5 sm:px-3 py-1.5">
            {isSaving ? (
              <>
                <LoaderIcon />
                <span className="hidden sm:inline text-[11px] font-semibold text-gray-500">Saving...</span>
              </>
            ) : status === 'submitted' ? (
              <>
                <CheckIcon />
                <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-600">Submitted</span>
              </>
            ) : (
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-widest">Draft</span>
            )}
          </div>
        </div>
      </nav>

      {/* Workspace Area */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-12">
        <div className="relative min-h-[calc(100vh-8rem)] w-full rounded-2xl border border-gray-100 bg-white p-5 sm:p-8 lg:p-12 shadow-[0_2px_20px_rgba(0,0,0,0.03)]">
          {children}
          
          {lastSaved && (
            <div className="absolute bottom-4 right-4 sm:bottom-8 sm:right-12 text-[10px] tabular-nums text-gray-400 font-medium bg-white/90 px-2 backdrop-blur-sm rounded">
              Last sync: {new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
