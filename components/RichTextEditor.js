'use client';

import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import useReportStore from "../store/useReportStore";

function ToolbarButton({ isActive, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
        isActive
          ? "bg-cyan-400 text-slate-950"
          : "bg-slate-900/80 text-slate-200 hover:bg-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({ canAutosave }) {
  const timerRef = useRef(null);
  const canAutosaveRef = useRef(canAutosave);

  const {
    clientId,
    reportMonth,
    reportId,
    content,
    error,
    setContent,
    initReport,
    autosave,
  } = useReportStore(
    useShallow((state) => ({
      clientId: state.clientId,
      reportMonth: state.reportMonth,
      reportId: state.reportId,
      content: state.content,
      error: state.error,
      setContent: state.setContent,
      initReport: state.initReport,
      autosave: state.autosave,
    }))
  );

  useEffect(() => {
    canAutosaveRef.current = canAutosave;
  }, [canAutosave]);

  const autosaveRef = useRef(autosave);
  const setContentRef = useRef(setContent);

  useEffect(() => {
    autosaveRef.current = autosave;
    setContentRef.current = setContent;
  }, [autosave, setContent]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Write your monthly report here...",
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          "prose prose-invert min-h-[420px] max-w-none rounded-b-2xl border border-t-0 border-white/10 bg-slate-950/50 px-5 py-4 text-slate-100 outline-none",
      },
    },
    onUpdate({ editor }) {
      const jsonContent = editor.getJSON();
      setContentRef.current(jsonContent);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      if (!canAutosaveRef.current) {
        return;
      }

      timerRef.current = setTimeout(() => {
        autosaveRef.current();
      }, 600);
    },
  });

  useEffect(() => {
    if (!clientId || !reportMonth) {
      return;
    }

    initReport();
  }, [clientId, reportMonth, initReport]);

  useEffect(() => {
    if (!editor || !content) {
      return;
    }

    const currentContent = JSON.stringify(editor.getJSON());
    const nextContent = JSON.stringify(content);

    if (currentContent !== nextContent) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  if (error && !reportId) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        {error}
      </div>
    );
  }

  if (!editor) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-6 text-sm text-slate-400">
        Preparing editor...
      </div>
    );
  }

  return (
    <div className="rounded-2xl">
      <div className="flex flex-wrap gap-2 rounded-t-2xl border border-white/10 bg-slate-900/70 p-3">
        <ToolbarButton
          isActive={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          Bold
        </ToolbarButton>
        <ToolbarButton
          isActive={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          Italic
        </ToolbarButton>
        <ToolbarButton
          isActive={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          Bullet List
        </ToolbarButton>
        <ToolbarButton
          isActive={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          Numbered List
        </ToolbarButton>
        <ToolbarButton
          isActive={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          isActive={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
