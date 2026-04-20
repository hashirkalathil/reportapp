'use client';

import { useState, useEffect } from 'react';

const QUESTION_TYPES = [
  { id: 'text',     label: 'Short Answer',    icon: 'M6 12h12' },
  { id: 'textarea', label: 'Paragraph',       icon: 'M4 6h16M4 12h16M4 18h10' },
  { id: 'number',   label: 'Numbers',          icon: 'M4 6h16M10 12h10M4 18h16' },
  { id: 'checkbox', label: 'Checkboxes',      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { id: 'radio',    label: 'Multiple Choice', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'select',   label: 'Dropdown',        icon: 'M19 9l-7 7-7-7' },
  { id: 'group',    label: 'Sub-Questions',   icon: 'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' },
];

export default function FormBuilderModal({ isOpen, onClose, initialData, clients, onSave }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDay, setDueDay] = useState('15');
  const [selectedClients, setSelectedClients] = useState([]);
  const [fields, setFields] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setDescription(initialData?.description || '');
      setDueDay(String(initialData?.due_day || 15));
      setSelectedClients(initialData?.assigned_client_ids || []);
      
      const initialFields = Array.isArray(initialData?.fields) ? initialData.fields : [];
      setFields(
        initialFields.length > 0
          ? initialFields.map(f => ({ 
              ...f, 
              localId: crypto.randomUUID(),
              options: Array.isArray(f.options) ? f.options.join(', ') : (f.options || ''),
              hints: Array.isArray(f.hints) ? f.hints.join(', ') : (f.hints || ''),
              children: Array.isArray(f.children) ? f.children.map(c => ({ ...c, localId: crypto.randomUUID() })) : undefined
            }))
          : [{ localId: crypto.randomUUID(), type: 'textarea', label: 'Draft Question 1', hints: '', required: false }]
      );
      setError('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  function toggleClient(clientId) {
    setSelectedClients(prev =>
      prev.includes(clientId) ? prev.filter(id => id !== clientId) : [...prev, clientId]
    );
  }

  function addField(type) {
    const defaultLabel = QUESTION_TYPES.find(t => t.id === type)?.label || 'New Question';
    const newField = { 
      localId: crypto.randomUUID(), 
      type, 
      label: `${defaultLabel} ${fields.length + 1}`, 
      hints: '', 
      required: false 
    };

    if (type === 'group') {
      newField.children = [{ localId: crypto.randomUUID(), label: 'Sub Field 1' }];
    }
    if (['checkbox', 'radio', 'select'].includes(type)) {
      newField.options = 'Option 1, Option 2';
    }

    setFields(prev => [...prev, newField]);
    
    // Auto-scroll to bottom
    setTimeout(() => {
      const entry = document.getElementById('fields-container');
      if (entry) entry.scrollTop = entry.scrollHeight;
    }, 100);
  }

  function removeField(index) {
    setFields(prev => prev.filter((_, i) => i !== index));
  }

  function updateField(index, updates) {
    setFields(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      // If changing type to group, ensure children exist
      if (updates.type === 'group' && !next[index].children) {
        next[index].children = [{ localId: crypto.randomUUID(), label: 'Sub Field 1' }];
      }
      // If changing to choice type, ensure options exist
      if (['checkbox', 'radio', 'select'].includes(updates.type) && !next[index].options) {
        next[index].options = 'Option 1, Option 2';
      }
      return next;
    });
  }

  function addSubField(fieldIndex) {
    setFields(prev => {
      const next = [...prev];
      const children = Array.isArray(next[fieldIndex].children) ? [...next[fieldIndex].children] : [];
      children.push({ localId: crypto.randomUUID(), label: `Sub Field ${children.length + 1}` });
      next[fieldIndex] = { ...next[fieldIndex], children };
      return next;
    });
  }

  function updateSubField(fieldIndex, subIndex, label) {
    setFields(prev => {
      const next = [...prev];
      const children = [...next[fieldIndex].children];
      children[subIndex] = { ...children[subIndex], label };
      next[fieldIndex] = { ...next[fieldIndex], children };
      return next;
    });
  }

  function removeSubField(fieldIndex, subIndex) {
    setFields(prev => {
      const next = [...prev];
      const children = next[fieldIndex].children.filter((_, i) => i !== subIndex);
      next[fieldIndex] = { ...next[fieldIndex], children };
      return next;
    });
  }

  function moveField(index, direction) {
    setFields(prev => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setPending(true);
    setError('');

    try {
      if (!name.trim()) throw new Error('Form name is required.');

      const schema = fields.map((f, i) => {
        const id = f.label.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "") || `field_${i+1}`;
        const base = {
          number: i + 1,
          id,
          label: f.label.trim() || `Field ${i+1}`,
          type: f.type,
          required: !!f.required,
        };
        
        if (f.hints) {
          base.hints = typeof f.hints === 'string' 
            ? f.hints.split(',').map(h => h.trim()).filter(Boolean)
            : Array.isArray(f.hints) ? f.hints : [];
        }

        if (['checkbox', 'radio', 'select'].includes(f.type) && f.options) {
          base.options = typeof f.options === 'string'
            ? f.options.split(',').map(o => o.trim()).filter(Boolean)
            : Array.isArray(f.options) ? f.options : [];
        }

        if (f.type === 'group') {
          base.children = f.children.map((child, j) => ({
             id: `${id}_${child.label.toLowerCase().replace(/[^a-z0-9_]+/g, "_") || j+1}`,
             label: child.label.trim() || `Sub Field ${j+1}`
          }));
        }

        return base;
      });

      const fd = new FormData();
      if (initialData?.id) fd.set('formId', initialData.id);
      fd.set('name', name.trim());
      fd.set('description', description.trim());
      fd.set('dueDay', dueDay);
      fd.set('schemaJson', JSON.stringify(schema));
      selectedClients.forEach(clientId => fd.append('clientIds', clientId));

      await onSave(fd);
      onClose();
    } catch (err) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-[1400px] max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden animate-modal-in" onMouseDown={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-8 py-5">
          <div className="flex items-center gap-3">
             <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#5D5FEF] text-white">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
             </div>
             <div>
                <h2 className="text-xl font-bold text-gray-800">{initialData ? 'Edit Form Template' : 'New Form Template'}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Build a high-performance reporting schema for your clients</p>
             </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-white p-2.5 text-gray-400 hover:text-gray-700 hover:shadow-md transition active:scale-95 border border-gray-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar: Metadata */}
          <aside className="w-80 border-r border-gray-100 bg-gray-50/30 overflow-y-auto p-6 space-y-6">
            <div>
              <label className="mb-2 block text-[0.65rem] font-bold uppercase tracking-[0.15em] text-gray-400">Basic Information</label>
              <div className="space-y-4">
                 <div>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Report Header"
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-[#5D5FEF] focus:ring-4 focus:ring-[#5D5FEF]/10"
                    />
                 </div>
                 <div>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Report Description"
                      rows={3}
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 outline-none transition focus:border-[#5D5FEF] focus:ring-4 focus:ring-[#5D5FEF]/10 resize-none"
                    />
                 </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[0.65rem] font-bold uppercase tracking-[0.15em] text-gray-400">Due Schedule</label>
              <div className="flex items-center gap-3">
                 <div className="flex px-4 py-3 bg-white rounded-2xl border border-gray-200 flex-1">
                    <span className="text-xs font-bold text-gray-400 mr-2 self-center">Day</span>
                    <input
                      type="number" min="1" max="31"
                      value={dueDay}
                      onChange={(e) => setDueDay(e.target.value)}
                      className="w-full text-sm font-bold text-gray-800 outline-none bg-transparent"
                    />
                 </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[0.65rem] font-bold uppercase tracking-[0.15em] text-gray-400">Assign Clients ({selectedClients.length})</label>
              <div className="grid gap-2 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                {clients.map(client => (
                  <label key={client.id} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-bold transition cursor-pointer border ${selectedClients.includes(client.id) ? 'bg-[#5D5FEF] border-[#5D5FEF] text-white shadow-lg shadow-indigo-100' : 'bg-white border-gray-100 text-gray-600 hover:border-gray-300'}`}>
                    <input 
                      type="checkbox" 
                      className="hidden"
                      checked={selectedClients.includes(client.id)}
                      onChange={() => toggleClient(client.id)}
                    />
                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${selectedClients.includes(client.id) ? 'border-white' : 'border-gray-200'}`}>
                       {selectedClients.includes(client.id) && <div className="h-2 w-2 rounded-full bg-white animate-scale-in" />}
                    </div>
                    <span className="truncate">{client.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Workspace: Builder */}
          <main className="flex-1 flex flex-col bg-white">
             {/* Type Palette Toolbar */}
             <div className="border-b border-gray-100 p-4 bg-white sticky top-0 z-10 flex items-center overflow-x-auto no-scrollbar gap-2">
                <span className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400 mr-2 ml-4">Palette:</span>
                {QUESTION_TYPES.map(type => (
                   <button
                    key={type.id}
                    type="button"
                    onClick={() => addField(type.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 border border-gray-100 text-xs font-bold text-gray-600 hover:bg-[#5D5FEF] hover:text-white hover:border-[#5D5FEF] hover:shadow-lg hover:shadow-indigo-100 transition active:scale-95 whitespace-nowrap"
                   >
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <path d={type.icon} />
                     </svg>
                     {type.label}
                   </button>
                ))}
             </div>

             <div id="fields-container" className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#fcfcfd]">
                {fields.map((field, i) => (
                  <div key={field.localId} className="group relative rounded-3xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-xl hover:shadow-gray-200/40 transition-all duration-300">
                    <div className="flex gap-6">
                      {/* Left side actions */}
                      <div className="flex flex-col gap-2 pt-1 transition opacity-0 group-hover:opacity-100">
                         <button onClick={() => moveField(i, -1)} disabled={i===0} className="p-1 px-1.5 rounded-lg bg-gray-50 text-gray-400 hover:text-[#5D5FEF] disabled:opacity-0 transition">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="18 15 12 9 6 15"/></svg>
                         </button>
                         <div className="h-8 w-8 rounded-2xl bg-indigo-50 flex items-center justify-center text-xs font-black text-[#5D5FEF]">
                            {i + 1}
                         </div>
                         <button onClick={() => moveField(i, 1)} disabled={i===fields.length-1} className="p-1 px-1.5 rounded-lg bg-gray-50 text-gray-400 hover:text-[#5D5FEF] disabled:opacity-0 transition">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 15"/></svg>
                         </button>
                      </div>

                      {/* Main field editor */}
                      <div className="flex-1 space-y-4">
                         <div className="flex flex-col md:flex-row gap-4 items-start">
                            <div className="flex-1 w-full">
                               <input
                                value={field.label}
                                onChange={(e) => updateField(i, { label: e.target.value })}
                                placeholder="Enter your question here..."
                                className="w-full text-lg font-bold text-gray-800 outline-none placeholder:text-gray-200 border-b-2 border-transparent focus:border-[#5D5FEF]/30 pb-1 transition-colors"
                               />
                               <div className="flex items-center gap-4 mt-2">
                                  <span className="text-[0.65rem] font-bold text-[#5D5FEF] uppercase bg-[#5D5FEF]/10 px-2 py-0.5 rounded-lg">
                                     {QUESTION_TYPES.find(t => t.id === field.type)?.label}
                                  </span>
                                  <div className="h-1 w-1 rounded-full bg-gray-200" />
                                  <label className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition">
                                     <input 
                                        type="checkbox" 
                                        checked={field.required}
                                        onChange={(e) => updateField(i, { required: e.target.checked })}
                                        className="accent-[#5D5FEF] h-3.5 w-3.5"
                                     />
                                     <span className="text-[0.7rem] font-bold uppercase tracking-wider text-gray-400">Required</span>
                                  </label>
                               </div>
                            </div>

                            <button onClick={() => removeField(i)} className="p-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition shadow-sm opacity-0 group-hover:opacity-100">
                               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                         </div>

                         {/* Contextual Options */}
                         <div className="space-y-4">
                            {/* Hints */}
                            <div className="flex items-center gap-3 bg-gray-50/50 rounded-2xl px-4 py-2 border border-gray-100">
                               <svg className="text-gray-300" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                               <input
                                  value={field.hints}
                                  onChange={(e) => updateField(i, { hints: e.target.value })}
                                  placeholder="Sub-labels or hints (comma separated)..."
                                  className="flex-1 bg-transparent text-xs font-medium text-gray-500 outline-none"
                               />
                            </div>

                            {/* Options (Choice types) */}
                            {['checkbox', 'radio', 'select'].includes(field.type) && (
                               <div className="pl-4 border-l-4 border-amber-100 space-y-2">
                                  <label className="text-[0.6rem] font-bold uppercase text-amber-500 block mb-1">Selectable Options</label>
                                  <textarea
                                    value={field.options}
                                    onChange={(e) => updateField(i, { options: e.target.value })}
                                    placeholder="Option A, Option B, Option C..."
                                    rows={2}
                                    className="w-full rounded-2xl bg-amber-50/20 border border-amber-100 px-4 py-3 text-xs font-bold text-amber-700 outline-none focus:bg-white transition resize-none"
                                  />
                               </div>
                            )}

                            {/* Children (Sub-questions) */}
                            {field.type === 'group' && (
                              <div className="pl-4 border-l-4 border-[#5D5FEF]/20 space-y-3">
                                 <label className="text-[0.6rem] font-bold uppercase text-[#5D5FEF] block mb-1">Nested Sub-Questions</label>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {field.children?.map((child, j) => (
                                       <div key={child.localId} className="flex items-center gap-2 group/sub animate-fade-in">
                                          <div className="h-7 w-7 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[0.65rem] font-bold text-[#5D5FEF] shrink-0">
                                             {String.fromCharCode(97 + j)}
                                          </div>
                                          <input
                                            value={child.label}
                                            onChange={(e) => updateSubField(i, j, e.target.value)}
                                            placeholder="Sub-question name..."
                                            className="flex-1 bg-white rounded-xl border border-gray-100 px-4 py-2 text-xs font-bold text-gray-700 outline-none focus:border-[#5D5FEF] transition shadow-sm"
                                          />
                                          <button onClick={() => removeSubField(i, j)} className="p-1.5 text-gray-300 hover:text-red-400 transition opacity-0 group-sub-hover:opacity-100">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                          </button>
                                       </div>
                                    ))}
                                    <button 
                                      onClick={() => addSubField(i)}
                                      className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#5D5FEF]/30 px-4 py-2 text-xs font-bold text-[#5D5FEF] hover:bg-[#5D5FEF]/5 transition active:scale-95"
                                    >
                                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                       New Sub-item
                                    </button>
                                 </div>
                              </div>
                            )}
                         </div>
                      </div>
                    </div>
                  </div>
                ))}

                {fields.length === 0 && (
                   <div className="flex flex-col h-[40vh] items-center justify-center text-center opacity-40">
                      <div className="h-20 w-20 rounded-full border-4 border-dashed border-gray-200 flex items-center justify-center mb-4">
                         <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                      </div>
                      <p className="text-sm font-black text-gray-800 uppercase tracking-widest">Workspace Empty</p>
                      <p className="text-xs text-gray-400 mt-2">Select a type from the palette above to begin</p>
                   </div>
                )}
             </div>
          </main>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 bg-gray-50/80 px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="text-xs text-red-500 font-bold uppercase tracking-widest animate-pulse">{error}</div>
             {!error && <div className="text-xs text-gray-400 font-medium">Auto-save draft active</div>}
          </div>
          <div className="flex gap-4">
             <button
               type="button"
               onClick={onClose}
               className="rounded-2xl border border-gray-200 bg-white px-7 py-3 text-sm font-bold text-gray-500 transition hover:bg-gray-50 active:scale-95"
             >
               Discard
             </button>
             <button
               onClick={handleSubmit}
               disabled={pending || !name.trim() || fields.length === 0}
               className="rounded-2xl bg-[#5D5FEF] px-10 py-3 text-sm font-bold text-white shadow-xl shadow-indigo-100 transition hover:bg-indigo-600 hover:shadow-indigo-200 active:scale-[0.98] disabled:opacity-40 disabled:shadow-none flex items-center gap-2"
             >
               {pending ? (
                 <>
                   <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                   Creating...
                 </>
               ) : 'Publish Template'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
