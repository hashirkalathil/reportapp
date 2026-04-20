'use client';

import { useEffect, useState, useCallback } from 'react';

const DRAFT_KEY = 'rg_last_selection_v1';

function saveDraft(clientId) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ clientId }));
  } catch {}
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function statusStyle(status) {
  if (status === 'submitted') return 'text-emerald-600 bg-emerald-50';
  if (status === 'draft') return 'text-amber-600  bg-amber-50';
  return '';
}

export default function SelectionGate({
  clients = [],
  isLoading = false,
  isLoadingForms = false,
  onStart,
  selectedClientId,
  setSelectedClientId,
  selectedFormId,
  setSelectedFormId,
  formOptions = [],
  dueItems = [],
}) {
  const [formStatuses, setFormStatuses] = useState([]);
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (isLoading || clients.length === 0) return;
    const saved = loadDraft();
    if (!saved) return;
    const clientExists = clients.find((c) => c.id === saved.clientId);
    if (clientExists && !selectedClientId) {
      setSelectedClientId(saved.clientId);
      setDraftRestored(true);
    }
  }, [
    isLoading,
    clients,
    selectedClientId,
    setSelectedClientId,
  ]);

  useEffect(() => {
    if (!selectedClientId) {
      setFormStatuses([]);
      return;
    }
    setLoadingStatuses(true);
    fetch(`/api/reports/status?clientId=${encodeURIComponent(selectedClientId)}`)
      .then((r) => r.json())
      .then((data) => setFormStatuses(data.forms || []))
      .catch(() => setFormStatuses([]))
      .finally(() => setLoadingStatuses(false));
  }, [selectedClientId]);

  const handleClientChange = useCallback(
    (id) => {
      setSelectedClientId(id);
      setSelectedFormId?.('');
      if (id) saveDraft(id);
    },
    [setSelectedClientId, setSelectedFormId]
  );

  const statusMap = Object.fromEntries(formStatuses.map((f) => [f.formId, f.status]));
  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const currentFormStatus = selectedFormId ? statusMap[selectedFormId] : null;
  const canStart = selectedClientId && selectedFormId && !isLoading;

  return (
    <div className="flex min-h-[85vh] items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="mb-6 sm:mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#5D5FEF] shadow-lg shadow-indigo-200">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Start a Report</h1>
          <p className="mt-1.5 text-sm text-gray-400">Select a client and form template to begin.</p>
        </div>

        {draftRestored && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-indigo-100 bg-[#5D5FEF]/5 px-4 py-2.5 text-sm text-[#5D5FEF]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <span>Restored your last selection</span>
            <button
              type="button"
              className="ml-auto text-[0.65rem] font-semibold underline-offset-2 hover:underline"
              onClick={() => {
                setDraftRestored(false);
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="rounded-2xl bg-white p-5 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.07)]">
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-400">Client</label>
              {isLoading ? (
                <div className="h-11 w-full animate-shimmer rounded-xl bg-gray-100" />
              ) : (
                <div className="relative">
                  <select
                    value={selectedClientId}
                    onChange={(e) => handleClientChange(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 pr-10 text-sm text-gray-800 outline-none transition focus:border-[#5D5FEF]/40 focus:bg-white focus:ring-2 focus:ring-[#5D5FEF]/10 disabled:opacity-50"
                  >
                    <option value="">Select a client...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                </div>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Report Form</label>
                {(isLoadingForms || loadingStatuses) && (
                  <span className="text-[0.65rem] text-gray-400 flex items-center gap-1">
                    <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                    Loading...
                  </span>
                )}
              </div>
              <div className="relative">
                <select
                  value={selectedFormId || ''}
                  onChange={(e) => setSelectedFormId?.(e.target.value)}
                  disabled={!selectedClientId || isLoadingForms}
                  className="w-full appearance-none rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 pr-10 text-sm text-gray-800 outline-none transition focus:border-[#5D5FEF]/40 focus:bg-white focus:ring-2 focus:ring-[#5D5FEF]/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <option value="">{!selectedClientId ? 'Select a client first...' : 'Select a report form...'}</option>
                  {formOptions.map((form) => {
                    const status = statusMap[form.id];
                    const label = status 
                      ? `${form.name} - ${status === 'submitted' ? 'Submitted' : 'Draft'}`
                      : form.name;
                    return (
                      <option key={form.id} value={form.id} disabled={status === 'submitted'}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
              {!isLoadingForms && selectedClientId && formOptions.length === 0 && (
                <p className="mt-2 text-[0.7rem] font-semibold text-red-400">No forms are assigned to this client yet.</p>
              )}
              {currentFormStatus && (
                <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold ${statusStyle(currentFormStatus)}`}>
                  {currentFormStatus === 'submitted' ? 'Report submitted - locked.' : 'Draft exists - you can continue.'}
                </div>
              )}
            </div>

            {!!dueItems.length && (
              <div className="rounded-xl border border-[#5D5FEF]/10 bg-[#5D5FEF]/5 px-4 py-3">
                <p className="text-[0.68rem] font-bold uppercase tracking-wider text-[#5D5FEF]">Due Status</p>
                <div className="mt-2 space-y-1.5">
                  {dueItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-700">{item.name}</span>
                      <span className={item.status === 'submitted' ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                        {item.status === 'submitted' ? 'Done' : `Due day ${item.due_day}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedClient && selectedFormId && !currentFormStatus && (
              <div className="rounded-xl border border-[#5D5FEF]/15 bg-[#5D5FEF]/5 px-4 py-3">
                <p className="text-xs font-semibold text-[#5D5FEF]">New report</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">{selectedClient.name} · {formOptions.find(f => f.id === selectedFormId)?.name}</p>
              </div>
            )}

            <button
              onClick={onStart}
              disabled={!canStart || currentFormStatus === 'submitted'}
              className="w-full rounded-xl bg-[#5D5FEF] py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200/50 transition hover:bg-indigo-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading
                ? 'Preparing...'
                : currentFormStatus === 'draft'
                ? 'Continue Draft'
                : currentFormStatus === 'submitted'
                ? 'Already Submitted'
                : 'Start Writing'}
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          Submitted reports are locked. Drafts can still be edited.
        </p>
      </div>
    </div>
  );
}
