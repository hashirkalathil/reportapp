'use client';

import { useState, useRef, useEffect } from "react";

export default function MonthActions({ month, editAction, deleteAction }) {
  const [editing, setEditing]   = useState(false);
  const [label, setLabel]       = useState(month.label);
  const [pending, setPending]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState("");
  const inputRef                = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function handleEdit(e) {
    e.preventDefault();
    if (!label.trim() || label.trim() === month.label) { setEditing(false); return; }
    setPending(true); setError("");
    try {
      const fd = new FormData();
      fd.set("monthId", month.id);
      fd.set("label", label.trim());
      await editAction(fd);
      setEditing(false);
    } catch (err) {
      setError(err.message || "Failed to update.");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${month.label}"? This cannot be undone.`)) return;
    setDeleting(true); setError("");
    try {
      const fd = new FormData();
      fd.set("monthId", month.id);
      await deleteAction(fd);
    } catch (err) {
      setError(err.message || "Failed to delete.");
      setDeleting(false);
    }
  }

  return (
    <>
      {editing ? (
        <form onSubmit={handleEdit} className="flex items-center gap-2 w-full sm:w-auto">
          <input
            ref={inputRef}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            disabled={pending}
            className="h-9 rounded-xl border border-[#5D5FEF]/40 bg-white px-3 text-sm text-gray-800 outline-none ring-2 ring-[#5D5FEF]/10 transition w-full sm:w-48"
            maxLength={80}
            required
          />
          <button
            type="submit" disabled={pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#5D5FEF] px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-600 disabled:opacity-50"
          >
            {pending ? (
              <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a10 10 0 0 1 10 10"/></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            )}
            Save
          </button>
          <button
            type="button" onClick={() => { setEditing(false); setLabel(month.label); }}
            className="inline-flex h-9 items-center rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-500 shadow-sm transition hover:bg-gray-50"
          >
            Cancel
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button" onClick={() => setEditing(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#5D5FEF]/20 bg-[#5D5FEF]/5 px-3 text-xs font-semibold text-[#5D5FEF] transition hover:border-[#5D5FEF]/40 hover:bg-[#5D5FEF]/10"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit
          </button>

          <button
            type="button" onClick={handleDelete} disabled={deleting}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-3 text-xs font-semibold text-red-500 transition hover:border-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? (
              <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a10 10 0 0 1 10 10"/></svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            )}
            Delete
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-500 w-full">{error}</p>}
    </>
  );
}
