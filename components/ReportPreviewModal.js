'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';

/* ── Icons ─────────────────────────── */
const IconPrint = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
);
const IconDocx = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);
const IconPdf = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <path d="M9 15h2a2 2 0 0 0 0-4H9v6"/>
  </svg>
);
const IconClose = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

/* ── helpers ────────────────────────── */
function getFilename(header, fallback) {
  const m = header?.match(/filename\*?=(?:UTF-8'')?\"?([^";]+)\"?/i);
  if (!m) return fallback;
  try { return decodeURIComponent(m[1]); } catch { return m[1]; }
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function tiptapToHtml(json) {
  if (!json || json.type !== 'doc' || !Array.isArray(json.content)) return '';
  return json.content.map((node) => {
    if (node.type === 'heading') {
      const lvl  = node.attrs?.level ?? 2;
      const text = node.content?.map((n) => n.text || '').join('') || '';
      return `<h${lvl}>${escapeHtml(text)}</h${lvl}>`;
    }
    if (node.type === 'paragraph') {
      const text = node.content?.map((n) => n.text || '').join('') || '';
      return text.trim() ? `<p>${escapeHtml(text)}</p>` : '<p>&nbsp;</p>';
    }
    return '';
  }).join('\n');
}

/* ── Skeleton ────────────────────────── */
function Skeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[['45%','20px'],['90%','14px'],['85%','14px'],['70%','14px'],['35%','18px'],['88%','14px'],['75%','14px']].map(([w,h],i) => (
        <div key={i} className="animate-shimmer rounded-md bg-gray-100" style={{ width: w, height: h }} />
      ))}
    </div>
  );
}

/* ── Report prose for light theme ─────── */
function ReportProse({ html }) {
  return (
    <div
      className="report-prose-light text-gray-700"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/* ── Main ────────────────────────────── */
export default function ReportPreviewModal({ reportId, clientName, onClose }) {
  const [content,       setContent]   = useState(null);
  const [isLoading,     setIsLoading] = useState(true);
  const [fetchError,    setError]     = useState('');
  const [downloadingId, setDlId]      = useState('');

  const sheetRef  = useRef(null);
  const printElem = useRef(null);

  useEffect(() => {
    if (!reportId) return;
    setIsLoading(true); setError('');
    fetch(`/api/reports/${encodeURIComponent(reportId)}`, { credentials: 'include' })
      .then((r) => { if (!r.ok) throw new Error('Failed to load report.'); return r.json(); })
      .then((d) => setContent(d.report?.content ?? null))
      .catch((e) => setError(e.message || 'Unable to load report.'))
      .finally(() => setIsLoading(false));
  }, [reportId]);

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  function onBackdrop(e) {
    if (sheetRef.current && !sheetRef.current.contains(e.target)) onClose();
  }

  const handleDownload = useCallback(async (fmt) => {
    const ep  = fmt === 'pdf' ? '/api/export-pdf' : '/api/export-docx';
    const fb  = `report-${reportId}.${fmt}`;
    setDlId(fmt);
    try {
      const res = await fetch(`${ep}?reportId=${encodeURIComponent(reportId)}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Download failed.');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement('a'), {
        href: url, download: getFilename(res.headers.get('content-disposition'), fb),
      });
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) { alert(e.message || 'Unable to download.'); }
    finally { setDlId(''); }
  }, [reportId]);

  const handlePrint = useCallback(() => {
    const html  = tiptapToHtml(content);
    document.getElementById('report-print-root')?.remove();
    
    const root  = document.createElement('div');
    root.id     = 'report-print-root';
    
    const now = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date());
    
    root.innerHTML = `
      <div class="print-cover">
        <h1>${escapeHtml(clientName)}</h1>
        <div class="print-meta">
          <span>Printed on: ${now}</span>
        </div>
      </div>
      <div class="print-content">
        ${html}
      </div>
      <div class="print-footer">
        <span>${escapeHtml(clientName)} — Printed on ${now}</span>
      </div>
    `;
    
    document.body.appendChild(root);
    printElem.current = root;
    window.print();
    const cleanup = () => { printElem.current?.remove(); printElem.current = null; window.removeEventListener('afterprint', cleanup); };
    window.addEventListener('afterprint', cleanup);
  }, [content, clientName]);

  const htmlContent = content ? tiptapToHtml(content) : '';
  const canExport   = !isLoading && !fetchError;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="animate-backdrop-in fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onMouseDown={onBackdrop}
      role="dialog" aria-modal="true" aria-label="Report Preview"
    >
      <div
        ref={sheetRef}
        className="animate-modal-in flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgba(0,0,0,0.15)]"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div>
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[#5D5FEF]">Report Preview</p>
            <h2 className="mt-0.5 text-lg font-bold text-gray-800">{clientName}</h2>
          </div>
          <button
            type="button" onClick={onClose} aria-label="Close preview"
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600"
          >
            <IconClose />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-7 py-6">
          {isLoading && <Skeleton />}
          {fetchError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-500">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {fetchError}
            </div>
          )}
          {!isLoading && !fetchError && (
            htmlContent.trim()
              ? <ReportProse html={htmlContent} />
              : <p className="py-12 text-center text-sm text-gray-400">This report has no content yet.</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/60 px-6 py-4">
          <span className="text-xs text-gray-400">Export or print this report</span>

          <div className="flex flex-wrap items-center gap-2">
            {/* Print */}
            <button
              type="button" onClick={handlePrint}
              disabled={!canExport || !htmlContent.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-500 shadow-sm transition hover:border-gray-300 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <IconPrint /> Print
            </button>

            {/* DOCX */}
            <button
              type="button" onClick={() => handleDownload('docx')}
              disabled={!canExport || !!downloadingId}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <IconDocx /> {downloadingId === 'docx' ? 'Exporting…' : 'Download DOCX'}
            </button>

            {/* PDF */}
            <button
              type="button" onClick={() => handleDownload('pdf')}
              disabled={!canExport || !!downloadingId}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#5D5FEF] px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <IconPdf /> {downloadingId === 'pdf' ? 'Exporting…' : 'Download PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
