'use client';

import { create } from "zustand";

const EMPTY_DOCUMENT = {
  type: "doc",
  content: [
    {
      type: "paragraph",
    },
  ],
};

let initPromise = null;

function cloneEmptyDocument() {
  return JSON.parse(JSON.stringify(EMPTY_DOCUMENT));
}

async function parseJsonResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || "Request failed.");
  }

  return data;
}

const useReportStore = create((set, get) => ({
  clientId: null,
  clientName: "",
  formId: "",
  formName: "",
  reportId: null,
  content: cloneEmptyDocument(),
  status: "draft",
  isSaving: false,
  lastSaved: null,
  error: "",

  setSelection: (clientId, clientName, formId, formName) =>
    set({
      clientId,
      clientName: clientName || "",
      formId: formId || "",
      formName: formName || "",
      reportId: null,
      content: cloneEmptyDocument(),
      status: "draft",
      isSaving: false,
      lastSaved: null,
      error: "",
    }),

  setContent: (jsonContent) =>
    set({
      content: jsonContent || cloneEmptyDocument(),
      error: "",
    }),

  initReport: async () => {
    const { clientId, formId } = get();
    const selectionKey = `${clientId}:${formId || ""}`;

    if (!clientId) {
      return null;
    }

    if (initPromise) {
      return initPromise;
    }

    initPromise = (async () => {
      set({ isSaving: true, error: "" });

      try {
        const existingResponse = await fetch(
          `/api/reports?clientId=${encodeURIComponent(
            clientId
          )}&formId=${encodeURIComponent(
            formId || ""
          )}`
        );
        const existingData = await parseJsonResponse(existingResponse);
        const existingReport = existingData.report;

        if (existingReport) {
          if (
            `${get().clientId}:${get().formId || ""}` !==
            selectionKey
          ) {
            return existingReport;
          }

          set({
            reportId: existingReport.id,
            content: existingReport.content || cloneEmptyDocument(),
            status: existingReport.status || "draft",
            lastSaved: existingReport.updated_at || new Date().toISOString(),
            isSaving: false,
            error: "",
          });

          return existingReport;
        }

        const payload = {
          clientId,
          formId: formId || "",
          content: cloneEmptyDocument(),
        };

        const insertResponse = await fetch("/api/reports", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const insertData = await parseJsonResponse(insertResponse);
        const insertedReport = insertData.report;

        if (
          `${get().clientId}:${get().formId || ""}` !==
          selectionKey
        ) {
          return insertedReport;
        }

        set({
          reportId: insertedReport.id,
          content: insertedReport.content || cloneEmptyDocument(),
          status: insertedReport.status || "draft",
          lastSaved: insertedReport.updated_at || new Date().toISOString(),
          isSaving: false,
          error: "",
        });

        return insertedReport;
      } catch (error) {
        set({
          isSaving: false,
          error: error.message || "Unable to initialize report.",
        });
        return null;
      } finally {
        initPromise = null;
      }
    })();

    return initPromise;
  },

  autosave: async (dataOverrides = null) => {
    const { clientId, formId, reportId, content, status } = get();

    if (!clientId || !reportId || !content) {
      return null;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return null;
    }

    set({ isSaving: true, error: "" });

    try {
      const response = await fetch("/api/reports", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportId,
          clientId,
          formId: formId || "",
          content,
          status,
          data: dataOverrides
        }),
      });
      const result = await parseJsonResponse(response);
      const data = result.report;

      set({
        isSaving: false,
        lastSaved: data?.updated_at || new Date().toISOString(),
        status: data?.status || status,
        error: "",
      });

      return data;
    } catch (error) {
      set({
        isSaving: false,
        error: error.message || "Unable to save report.",
      });
      return null;
    }
  },

  submitReport: async (dataOverrides = null) => {
    const { reportId } = get();

    if (!reportId) {
      return null;
    }

    set({ isSaving: true, error: "" });

    try {
      const response = await fetch("/api/reports", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportId,
          clientId: get().clientId,
          formId: get().formId || "",
          status: "submitted",
          data: dataOverrides
        }),
      });
      const result = await parseJsonResponse(response);
      const data = result.report;

      set({
        status: "submitted",
        isSaving: false,
        lastSaved: data?.updated_at || new Date().toISOString(),
        error: "",
      });

      return data;
    } catch (error) {
      set({
        isSaving: false,
        error: error.message || "Unable to submit report.",
      });
      return null;
    }
  },
}));

export default useReportStore;
