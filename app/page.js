'use client';

import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';

import { useShallow } from 'zustand/react/shallow';
import SelectionGate from '../components/SelectionGate';
import EditorWorkspace from '../components/EditorWorkspace';
import useReportStore from '../store/useReportStore';
import { mapValuesToTiptap, mapTiptapToValues } from '../lib/reportMapping';

/* ──────────────────────────── field schema ──────────────────────────── */

const FIELDS = [
  {
    id: 'academic_activities',
    number: 1,
    label: 'Academic Activities',
    type: 'textarea',
  },
  {
    id: 'cocurricular_activities',
    number: 2,
    label: 'Co-curricular Activities',
    type: 'textarea',
    hints: ['Class Union', 'Ahsan Contest', 'External Contest'],
  },
  {
    id: 'action_weak_section',
    number: 3,
    label: 'Action for the Weak Section',
    type: 'group',
    children: [
      { id: 'action_weak_academic', label: 'Academic Activities' },
      { id: 'action_weak_cocurricular', label: 'Co-curricular Activities' },
    ],
  },
  {
    id: 'behavioural_change',
    number: 4,
    label: 'Behavioural Change',
    type: 'textarea',
  },
  {
    id: 'personal_care',
    number: 5,
    label: 'Personal Care',
    type: 'textarea',
  },
  {
    id: 'health',
    number: 6,
    label: 'Health',
    type: 'group',
    children: [
      { id: 'health_mental', label: 'Mental Health' },
      { id: 'health_physical', label: 'Physical Health' },
    ],
  },
  {
    id: 'hygiene',
    number: 7,
    label: 'Hygiene',
    type: 'group',
    children: [
      { id: 'hygiene_personal', label: 'Personal' },
      { id: 'hygiene_spaces', label: 'Spaces' },
      { id: 'hygiene_sick', label: 'Sick' },
    ],
  },
  {
    id: 'documentation',
    number: 8,
    label: 'Documentation',
    type: 'textarea',
  },
  {
    id: 'annual_goals',
    number: 9,
    label: 'Annual Goals',
    type: 'textarea',
  },
  {
    id: 'others',
    number: 10,
    label: 'Others',
    type: 'textarea',
  },
];

function allTextareaKeys() {
  const keys = [];
  for (const field of FIELDS) {
    if (field.type === 'textarea') {
      keys.push(field.id);
    } else if (field.type === 'group') {
      for (const child of field.children) {
        keys.push(child.id);
      }
    }
  }
  return keys;
}

const ALL_KEYS = allTextareaKeys();

// (Static month generation has been moved to customizable Admin Panels)

/* ──────────────────────────── components ──────────────────────────── */

const CharCount = memo(function CharCount({ value }) {
  return (
    <span className="pointer-events-none select-none text-[10px] tabular-nums text-gray-400 dark:text-neutral-600 font-medium">
      {value.length} characters
    </span>
  );
});

const HintPills = memo(function HintPills({ hints }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {hints.map((hint) => (
        <span
          key={hint}
          className="rounded-full border border-gray-100 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-gray-500"
        >
          {hint}
        </span>
      ))}
    </div>
  );
});

const ReportTextarea = memo(function ReportTextarea({ id, value, onChange, placeholder }) {
  return (
    <div className="space-y-2">
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(id, e.target.value)}
        placeholder={placeholder || 'Write your report here…'}
        rows={4}
        className="w-full resize-y rounded-xl border border-gray-100 bg-gray-50/30 px-4 py-3 text-sm leading-relaxed text-gray-900 outline-none transition-all placeholder:text-gray-300 focus:border-indigo-500/30 focus:bg-white"
      />
      <div className="flex justify-end pr-1">
        <CharCount value={value} />
      </div>
    </div>
  );
});

const FieldCard = memo(function FieldCard({ field, values, onChange }) {
  const isGroup = field.type === 'group';

  const relevantKeys = isGroup
    ? field.children.map((c) => c.id)
    : [field.id];
  const cardValues = {};
  for (const key of relevantKeys) {
    cardValues[key] = values[key] || '';
  }

  return (
    <div className="group space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-[10px] font-bold text-white">
          {field.number}
        </span>
        <label
          htmlFor={!isGroup ? field.id : undefined}
          className="text-sm font-bold tracking-tight text-gray-900 uppercase"
        >
          {field.label}
        </label>
      </div>

      {field.hints && <HintPills hints={field.hints} />}

      <div className={isGroup ? "space-y-6 pl-9 border-l border-gray-100" : ""}>
        {!isGroup ? (
          <ReportTextarea
            id={field.id}
            value={cardValues[field.id]}
            onChange={onChange}
          />
        ) : (
          field.children.map((child) => (
            <div key={child.id} className="space-y-2">
              <label
                htmlFor={child.id}
                className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400"
              >
                {child.label}
              </label>
              <ReportTextarea
                id={child.id}
                value={cardValues[child.id]}
                onChange={onChange}
                placeholder={`Write about ${child.label.toLowerCase()}…`}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  if (prevProps.onChange !== nextProps.onChange) return false;
  if (prevProps.field !== nextProps.field) return false;

  const keys = prevProps.field.type === 'group'
    ? prevProps.field.children.map((c) => c.id)
    : [prevProps.field.id];

  for (const key of keys) {
    if (prevProps.values[key] !== nextProps.values[key]) return false;
  }
  return true;
});

/* ──────────────────────────── page ──────────────────────────── */

export default function ReportFormPage() {
  // App State
  const [values, setValues] = useState({});
  const [hydrated, setHydrated] = useState(false);
  const [clients, setClients] = useState([]);
  const [monthOptions, setMonthOptions] = useState([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [clientsError, setClientsError] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [submitMessage, setSubmitMessage] = useState('');

  const timerRef = useRef(null);
  const lastSyncId = useRef(null);

  const {
    clientId,
    clientName,
    reportMonth,
    content,
    status,
    isSaving,
    lastSaved,
    setSelection,
    initReport,
    setContent,
    autosave,
    submitReport,
  } = useReportStore(
    useShallow((state) => ({
      clientId: state.clientId,
      clientName: state.clientName,
      reportMonth: state.reportMonth,
      content: state.content,
      status: state.status,
      isSaving: state.isSaving,
      lastSaved: state.lastSaved,
      setSelection: state.setSelection,
      initReport: state.initReport,
      setContent: state.setContent,
      autosave: state.autosave,
      submitReport: state.submitReport,
    }))
  );

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (clientId) setSelectedClientId(clientId);
    if (reportMonth) setSelectedMonth(reportMonth);
    
    const currentSelection = `${clientId}:${reportMonth}`;
    if (clientId && content && lastSyncId.current !== currentSelection) {
      const serverValues = mapTiptapToValues(content, FIELDS);
      if (Object.keys(serverValues).length > 0) {
        setValues(serverValues);
      } else {
        setValues({});
      }
      lastSyncId.current = currentSelection;
    }
  }, [clientId, reportMonth, content]);

  // Initial Data Loading
  useEffect(() => {
    async function loadInitialData() {
      setIsLoadingClients(true);
      try {
        const [clientsRes, monthsRes] = await Promise.all([
          fetch('/api/clients'),
          fetch('/api/months')
        ]);
        
        const clientsData = await clientsRes.json();
        const monthsData = await monthsRes.json();
        
        if (!clientsRes.ok) throw new Error(clientsData.error || "Failed to load clients");
        if (!monthsRes.ok) throw new Error(monthsData.error || "Failed to load periods");
        
        const activeClients = clientsData.clients || [];
        const activeMonths = monthsData.months || [];

        setClients(activeClients);
        setMonthOptions(activeMonths);

        if (!selectedMonth && activeMonths.length > 0) {
          setSelectedMonth(activeMonths[0]);
        }
      } catch (error) {
        setClientsError(error.message || "Unable to load gate data.");
      } finally {
        setIsLoadingClients(false);
      }
    }
    loadInitialData();
  }, [selectedMonth]);

  const scheduleSave = useCallback((nextValues) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const tiptapJson = mapValuesToTiptap(nextValues, FIELDS);
        setContent(tiptapJson);
        await autosave();
      } catch (err) {
        console.error("Autosave failed:", err);
      }
    }, 800);
  }, [setContent, autosave]);

  function handleChange(id, text) {
    setSubmitMessage('');
    const next = { ...values, [id]: text };
    setValues(next);
    scheduleSave(next);
  }

  async function handleStartReport() {
    const selectedClient = clients.find((client) => client.id === selectedClientId);
    if (!selectedClient || !selectedMonth) return;
    
    setSelection(selectedClient.id, selectedClient.name, selectedMonth);
    await initReport();
  }

  function handleChangeSelection() {
    const hasContent = ALL_KEYS.some((key) => (values[key] || '').trim().length > 0);
    if (hasContent) {
      const confirmed = window.confirm("You have progress. Do you want to change the selection?");
      if (!confirmed) return;
    }
    setSelection(null, "", "");
  }

  function handleClearAll() {
    if (!window.confirm('Clear all fields? This cannot be undone.')) return;
    const empty = {};
    setValues(empty);
    
    setContent(mapValuesToTiptap(empty, FIELDS));
    autosave();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const hasContent = ALL_KEYS.some((key) => (values[key] || '').trim().length > 0);
    if (!hasContent) {
      setSubmitMessage('error:Please fill in at least one field.');
      return;
    }

    const tiptapJson = mapValuesToTiptap(values, FIELDS);
    setContent(tiptapJson);
    await autosave();

    const result = await submitReport();
    if (result) {
      setSubmitMessage('success:Report submitted successfully!');
      setTimeout(() => {
        setValues({});
        setContent(mapValuesToTiptap({}, FIELDS));
        setSelection(null, "", "");
        setTimeout(() => setSubmitMessage(''), 4000);
      }, 1500);
    } else {
      setSubmitMessage('error:Submission failed. Please try again.');
    }
  }

  if (!hydrated) return null;

  return (
    <>
      {!clientId ? (
        <div className="min-h-screen bg-gray-50/50">
           <SelectionGate
            clients={clients}
            isLoading={isLoadingClients}
            onStart={handleStartReport}
            selectedClientId={selectedClientId}
            setSelectedClientId={setSelectedClientId}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            mouthOptions={monthOptions}
          />
          {clientsError && (
             <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-medium border border-red-100">
               {clientsError}
             </div>
          )}
          {submitMessage && submitMessage.startsWith('success') && (
             <div className="fixed top-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-bold border border-emerald-100 shadow-[0_4px_24px_rgba(16,185,129,0.15)] z-50 animate-bounce">
               {submitMessage.split(':')[1]}
             </div>
          )}
        </div>
      ) : (
        <EditorWorkspace
          status={status}
          isSaving={isSaving}
          lastSaved={lastSaved}
          clientName={clientName}
          reportMonth={reportMonth}
          onChangeSelection={handleChangeSelection}
        >
          <form onSubmit={handleSubmit} className="space-y-12">
            <div className="space-y-16">
              {FIELDS.map((field) => (
                <FieldCard
                  key={field.id}
                  field={field}
                  values={values}
                  onChange={handleChange}
                />
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 pt-10">
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors"
                disabled={isSaving}
              >
                Clear All Data
              </button>

              <div className="flex items-center gap-4">
                {submitMessage && (
                  <span className={`text-xs font-bold uppercase tracking-wider ${submitMessage.startsWith('error') ? 'text-red-500' : 'text-emerald-500'}`}>
                    {submitMessage.split(':')[1]}
                  </span>
                )}
                <button
                  type="submit"
                  disabled={isSaving || status === 'submitted'}
                  className="rounded-xl bg-[#5D5FEF] px-8 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-md shadow-indigo-200/50 transition-all hover:bg-indigo-600 disabled:opacity-50"
                >
                  {status === 'submitted' ? 'Submitted' : 'Submit Report'}
                </button>
              </div>
            </div>
          </form>
        </EditorWorkspace>
      )}
    </>
  );
}
