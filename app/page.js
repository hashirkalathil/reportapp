'use client';

import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import SelectionGate from '../components/SelectionGate';
import EditorWorkspace from '../components/EditorWorkspace';
import useReportStore from '../store/useReportStore';
import { mapValuesToTiptap, mapTiptapToValues } from '../lib/reportMapping';
import {
  DEFAULT_REPORT_FIELDS,
  normalizeReportFields,
  listFormTextareaKeys,
} from '../lib/reportFormSchema';

const CharCount = memo(function CharCount({ value }) {
  const length = typeof value === 'string' ? value.length : (Array.isArray(value) ? value.length : 0);
  return (
    <span className="pointer-events-none select-none text-[10px] tabular-nums text-gray-400 dark:text-neutral-600 font-medium">
      {length} items/chars
    </span>
  );
});

const HintPills = memo(function HintPills({ hints }) {
  if (!hints || !hints.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {hints.map((hint, index) => (
        <span
          key={`${hint}-${index}`}
          className="rounded-full border border-gray-100 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-gray-500"
        >
          {hint}
        </span>
      ))}
    </div>
  );
});

const ReportInput = memo(function ReportInput({ id, value, onChange, placeholder, type = "text" }) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(id, e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-gray-100 bg-gray-50/30 px-4 py-3 text-sm leading-relaxed text-gray-900 outline-none transition-all placeholder:text-gray-300 focus:border-indigo-500/30 focus:bg-white"
    />
  );
});

const ReportCheckbox = memo(function ReportCheckbox({ id, value, onChange, options = [] }) {
  const selected = Array.isArray(value) ? value : (value ? value.split(', ') : []);
  
  const toggle = (opt) => {
    const next = selected.includes(opt) 
      ? selected.filter(s => s !== opt) 
      : [...selected, opt];
    onChange(id, next);
  };

  return (
    <div className="flex flex-wrap gap-3">
      {options.map(opt => (
        <label key={opt} className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all cursor-pointer text-sm ${selected.includes(opt) ? 'bg-indigo-50 border-indigo-200 text-[#5D5FEF] font-bold' : 'bg-gray-50/30 border-gray-100 text-gray-500 hover:border-gray-200'}`}>
           <input type="checkbox" className="hidden" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
           <div className={`h-4 w-4 rounded border flex items-center justify-center ${selected.includes(opt) ? 'bg-[#5D5FEF] border-[#5D5FEF]' : 'border-gray-200 bg-white'}`}>
              {selected.includes(opt) && <svg className="text-white" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
           </div>
           {opt}
        </label>
      ))}
    </div>
  );
});

const ReportRadio = memo(function ReportRadio({ id, value, onChange, options = [] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map(opt => (
        <label key={opt} className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all cursor-pointer text-sm ${value === opt ? 'bg-indigo-50 border-indigo-200 text-[#5D5FEF] font-bold' : 'bg-gray-50/30 border-gray-100 text-gray-500 hover:border-gray-200'}`}>
           <input type="radio" name={id} className="hidden" checked={value === opt} onChange={() => onChange(id, opt)} />
           <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${value === opt ? 'border-[#5D5FEF] bg-white' : 'border-gray-200 bg-white'}`}>
              {value === opt && <div className="h-2 w-2 rounded-full bg-[#5D5FEF]" />}
           </div>
           {opt}
        </label>
      ))}
    </div>
  );
});

const ReportSelect = memo(function ReportSelect({ id, value, onChange, options = [] }) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(id, e.target.value)}
      className="w-full rounded-xl border border-gray-100 bg-gray-50/30 px-4 py-3 text-sm leading-relaxed text-gray-900 outline-none transition-all focus:border-indigo-500/30 focus:bg-white appearance-none"
    >
      <option value="">Select an option...</option>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  );
});

const ReportTextarea = memo(function ReportTextarea({ id, value, onChange, placeholder }) {
  return (
    <div className="space-y-2">
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(id, e.target.value)}
        placeholder={placeholder || 'Write your report here...'}
        rows={4}
        className="w-full resize-y rounded-xl border border-gray-100 bg-gray-50/30 px-4 py-3 text-sm leading-relaxed text-gray-900 outline-none transition-all placeholder:text-gray-300 focus:border-indigo-500/30 focus:bg-white"
      />
      <div className="flex justify-end pr-1">
        <CharCount value={value} />
      </div>
    </div>
  );
});

function FieldRenderer({ field, value, onChange }) {
  const commonProps = { id: field.id, value, onChange, placeholder: field.hints?.[0] || "" };
  
  switch (field.type) {
    case 'text': return <ReportInput {...commonProps} />;
    case 'number': return <ReportInput {...commonProps} type="number" />;
    case 'checkbox': return <ReportCheckbox {...commonProps} options={field.options} />;
    case 'radio': return <ReportRadio {...commonProps} options={field.options} />;
    case 'select': return <ReportSelect {...commonProps} options={field.options} />;
    case 'textarea':
    default: return <ReportTextarea {...commonProps} />;
  }
}

const FieldCard = memo(
  function FieldCard({ field, values, onChange }) {
    const isGroup = field.type === 'group';
    const relevantKeys = isGroup ? field.children.map((c) => c.id) : [field.id];
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
          <div className="flex items-center gap-2">
             <label
               htmlFor={!isGroup ? field.id : undefined}
               className="text-sm font-bold tracking-tight text-gray-900 uppercase"
             >
               {field.label}
             </label>
             {field.required && <span className="text-[0.6rem] font-bold uppercase text-red-500 bg-red-50 px-1 py-0.5 rounded">Required</span>}
          </div>
        </div>

        {field.hints && field.type !== 'textarea' && field.type !== 'text' && field.type !== 'number' && <HintPills hints={field.hints} />}

        <div className={isGroup ? 'space-y-6 pl-9 border-l border-gray-100' : ''}>
          {!isGroup ? (
            <FieldRenderer field={field} value={cardValues[field.id]} onChange={onChange} />
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
                  placeholder={`Write about ${child.label.toLowerCase()}...`}
                />
              </div>
            ))
          )}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    if (prevProps.onChange !== nextProps.onChange) return false;
    if (prevProps.field !== nextProps.field) return false;

    const keys =
      prevProps.field.type === 'group'
        ? prevProps.field.children.map((c) => c.id)
        : [prevProps.field.id];

    for (const key of keys) {
      if (prevProps.values[key] !== nextProps.values[key]) return false;
    }

    return true;
  }
);

export default function ReportFormPage() {
  const [values, setValues] = useState({});
  const [hydrated, setHydrated] = useState(false);
  const [clients, setClients] = useState([]);
  const [monthOptions, setMonthOptions] = useState([]);
  const [formOptions, setFormOptions] = useState([]);
  const [dueItems, setDueItems] = useState([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingForms, setIsLoadingForms] = useState(false);
  const [clientsError, setClientsError] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedFormId, setSelectedFormId] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');

  const timerRef = useRef(null);
  const lastSyncId = useRef(null);

  const {
    clientId,
    clientName,
    formId,
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
      formId: state.formId,
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

  const selectedForm = useMemo(
    () => formOptions.find((form) => form.id === selectedFormId) || null,
    [formOptions, selectedFormId]
  );

  const activeFields = useMemo(
    () => normalizeReportFields(selectedForm?.fields || DEFAULT_REPORT_FIELDS),
    [selectedForm]
  );

  const allKeys = useMemo(() => listFormTextareaKeys(activeFields), [activeFields]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (clientId) setSelectedClientId(clientId);
    if (formId) setSelectedFormId(formId);

    const currentSelection = `${clientId}:${formId || ''}`;
    if (clientId && content && lastSyncId.current !== currentSelection) {
      const serverValues = mapTiptapToValues(content, activeFields);
      if (Object.keys(serverValues).length > 0) {
        setValues(serverValues);
      } else {
        setValues({});
      }
      lastSyncId.current = currentSelection;
    }
  }, [clientId, formId, content, activeFields]);

  useEffect(() => {
    async function loadInitialData() {
      setIsLoadingClients(true);
      try {
        const clientsRes = await fetch('/api/clients');
        const clientsData = await clientsRes.json();

        if (!clientsRes.ok) throw new Error(clientsData.error || 'Failed to load clients');

        const activeClients = clientsData.clients || [];

        setClients(activeClients);
      } catch (error) {
        setClientsError(error.message || 'Unable to load gate data.');
      } finally {
        setIsLoadingClients(false);
      }
    }

    loadInitialData();
  }, []);

  useEffect(() => {
    async function loadClientForms() {
      if (!selectedClientId) {
        setFormOptions([]);
        setSelectedFormId('');
        return;
      }

      setIsLoadingForms(true);
      try {
        const response = await fetch(`/api/report-forms?clientId=${encodeURIComponent(selectedClientId)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load forms');

        const forms = (data.forms || []).map((form) => ({
          ...form,
          fields: normalizeReportFields(form.fields || DEFAULT_REPORT_FIELDS),
        }));

        setFormOptions(forms);

        if (!forms.find((form) => form.id === selectedFormId)) {
          setSelectedFormId(forms[0]?.id || '');
        }
      } catch {
        setFormOptions([]);
        setSelectedFormId('');
      } finally {
        setIsLoadingForms(false);
      }
    }

    loadClientForms();
  }, [selectedClientId]);

  useEffect(() => {
    async function loadDueItems() {
      if (!selectedClientId) {
        setDueItems([]);
        return;
      }

      try {
        const response = await fetch(
          `/api/report-forms/due?clientId=${encodeURIComponent(selectedClientId)}`
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load due reports');
        setDueItems(data.due || []);
      } catch {
        setDueItems([]);
      }
    }

    loadDueItems();
  }, [selectedClientId]);

  const scheduleSave = useCallback(
    (nextValues) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        try {
          const tiptapJson = mapValuesToTiptap(nextValues, activeFields);
          setContent(tiptapJson);
          await autosave(nextValues);
        } catch {
          // noop
        }
      }, 800);
    },
    [setContent, autosave, activeFields]
  );

  function handleChange(id, text) {
    setSubmitMessage('');
    const next = { ...values, [id]: text };
    setValues(next);
    scheduleSave(next);
  }

  async function handleStartReport() {
    const selectedClient = clients.find((client) => client.id === selectedClientId);
    const selectedFormEntry = formOptions.find((form) => form.id === selectedFormId);
    if (!selectedClient || !selectedFormEntry) return;

    setSelection(
      selectedClient.id,
      selectedClient.name,
      selectedFormEntry.id,
      selectedFormEntry.name
    );
    await initReport();
  }

  function handleChangeSelection() {
    const hasContent = allKeys.some((key) => {
      const val = values[key];
      if (!val) return false;
      if (Array.isArray(val)) return val.length > 0;
      return String(val).trim().length > 0;
    });
    if (hasContent) {
      const confirmed = window.confirm('You have progress. Do you want to change the selection?');
      if (!confirmed) return;
    }
    setSelection(null, '', '', '', '');
    setSelectedFormId('');
  }

  function handleClearAll() {
    if (!window.confirm('Clear all fields? This cannot be undone.')) return;
    const empty = {};
    setValues(empty);

    setContent(mapValuesToTiptap(empty, activeFields));
    autosave();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    const hasAnyContent = allKeys.some((key) => {
      const val = values[key];
      if (!val) return false;
      if (Array.isArray(val)) return val.length > 0;
      return String(val).trim().length > 0;
    });
    if (!hasAnyContent) {
      setSubmitMessage('error:Please fill in at least one field.');
      return;
    }

    const missingFields = [];
    for (const field of activeFields) {
      if (field.required) {
        if (field.type === 'group') {
          const missingChildren = field.children.filter(child => {
            const val = values[child.id];
            return !val || (typeof val === 'string' && !val.trim());
          });
          if (missingChildren.length > 0) {
            missingFields.push(field.label);
          }
        } else {
          const val = values[field.id];
          const isEmpty = !val || (Array.isArray(val) && val.length === 0) || (typeof val === 'string' && !val.trim());
          if (isEmpty) {
            missingFields.push(field.label);
          }
        }
      }
    }

    if (missingFields.length > 0) {
      setSubmitMessage(`error:Required fields missing: ${missingFields.join(', ')}`);
      return;
    }

    const tiptapJson = mapValuesToTiptap(values, activeFields);
    setContent(tiptapJson);
    await autosave(values);

    const result = await submitReport(values);
    if (result) {
      setSubmitMessage('success:Report submitted successfully!');
      setTimeout(() => {
        setValues({});
        setContent(mapValuesToTiptap({}, activeFields));
        setSelection(null, '', '', '', '');
        setSelectedFormId('');
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
            isLoadingForms={isLoadingForms}
            onStart={handleStartReport}
            selectedClientId={selectedClientId}
            setSelectedClientId={setSelectedClientId}
            selectedFormId={selectedFormId}
            setSelectedFormId={setSelectedFormId}
            formOptions={formOptions}
            dueItems={dueItems}
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
          clientName={selectedForm ? `${clientName} - ${selectedForm.name}` : clientName}
          onChangeSelection={handleChangeSelection}
        >
          <form onSubmit={handleSubmit} className="space-y-12">
            <div className="space-y-16">
              {activeFields.map((field) => (
                <FieldCard key={field.id} field={field} values={values} onChange={handleChange} />
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
                  <span
                    className={`text-xs font-bold uppercase tracking-wider ${
                      submitMessage.startsWith('error') ? 'text-red-500' : 'text-emerald-500'
                    }`}
                  >
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
