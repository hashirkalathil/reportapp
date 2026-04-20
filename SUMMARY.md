# Report Generation Platform - Technical Summary

## 1. Architecture Overview

This repository implements a two-surface report generation platform using Next.js App Router:

- Public authoring surface at `/` for creating and editing client reports.
- Protected admin surface at `/admin/*` for report oversight, client management, report form (template) management, and export operations.

At a high level:

1. The UI layer (App Router pages + React components) captures report input and admin operations.
2. A centralized Zustand store coordinates report lifecycle actions (load draft, create draft, autosave, submit).
3. API route handlers persist and retrieve data from Firestore through Firebase Admin SDK.
4. Middleware and server-side auth helpers enforce session-based access controls for admin and export flows.
5. Export endpoints transform stored report content into PDF (`@react-pdf/renderer`) and DOCX (`docx`) outputs.

Core stack from [package.json](package.json):

- Next.js 16.2.3 + React 19
- Zustand for client state coordination
- Firebase Admin/Client SDK for data access
- Tiptap packages present for rich-text content model compatibility
- PDF and DOCX generation libraries for final output artifacts

## 2. Key File Connections (Dependency Map)

### 2.1 Public Authoring Flow Graph

1. [app/page.js](app/page.js)
   - Imports [components/SelectionGate.js](components/SelectionGate.js) for client/form gating.
   - Imports [components/EditorWorkspace.js](components/EditorWorkspace.js) for editor shell/status chrome.
   - Imports [store/useReportStore.js](store/useReportStore.js) for report lifecycle operations.
   - Imports [lib/reportMapping.js](lib/reportMapping.js) for value/document mapping.
2. [components/SelectionGate.js](components/SelectionGate.js)
   - Uses API endpoints:
   - [app/api/clients/route.js](app/api/clients/route.js)
   - [app/api/report-forms/route.js](app/api/report-forms/route.js)
   - [app/api/reports/status/route.js](app/api/reports/status/route.js)
3. [store/useReportStore.js](store/useReportStore.js)
   - Calls [app/api/reports/route.js](app/api/reports/route.js) with `GET` to load existing draft for a client/form pair.
   - `POST` to create initial draft and `PUT` to autosave/submit.
4. [app/api/reports/route.js](app/api/reports/route.js)
   - Uses [lib/firebaseAdmin.js](lib/firebaseAdmin.js) Firestore client.
   - Reads/writes `reports` collection.

### 2.2 Admin Surface Graph

1. [app/admin/(dashboard)/page.js](app/admin/(dashboard)/page.js)
   - Enforces session via [lib/adminAuth.js](lib/adminAuth.js).
   - Reads `clients` + `reports` via [lib/firebaseAdmin.js](lib/firebaseAdmin.js).
   - Renders [components/DashboardTable.js](components/DashboardTable.js).
2. [components/DashboardTable.js](components/DashboardTable.js)
   - Opens [components/ReportPreviewModal.js](components/ReportPreviewModal.js) for preview/export actions.
3. [components/ReportPreviewModal.js](components/ReportPreviewModal.js)
   - Fetches report content via [app/api/reports/[id]/route.js](app/api/reports/[id]/route.js).
   - Triggers export via:
   - [app/api/export-pdf/route.js](app/api/export-pdf/route.js)
   - [app/api/export-docx/route.js](app/api/export-docx/route.js)
4. Admin management pages:
   - [app/admin/(dashboard)/clients/page.js](app/admin/(dashboard)/clients/page.js)
   - [app/admin/(dashboard)/reports/page.js](app/admin/(dashboard)/reports/page.js) (formerly months)
   - Both use Server Actions + [lib/adminAuth.js](lib/adminAuth.js) + [lib/firebaseAdmin.js](lib/firebaseAdmin.js).

### 2.3 Auth and Request Protection Graph

1. [app/api/admin-login/route.js](app/api/admin-login/route.js)
   - Validates credentials from environment variables.
   - Creates signed session token using [lib/adminSession.js](lib/adminSession.js).
   - Writes HTTP-only cookie.
2. [middleware.js](middleware.js)
   - Protects `/admin/*` (except login) and `/api/export-*`.
   - Verifies session signature and TTL.
   - Redirects unauthenticated admin requests to login.
   - Returns `401` for unauthenticated export API calls.
3. [lib/adminAuth.js](lib/adminAuth.js)
   - Adds server-component and server-action level checks (`requireAdminSession`, `assertAdminSession`) for defense in depth.

### 2.4 Parsing and Export Graph

1. [app/api/export-pdf/route.js](app/api/export-pdf/route.js)
2. [app/api/export-docx/route.js](app/api/export-docx/route.js)
   - Both fetch report + client metadata via [lib/firebaseAdmin.js](lib/firebaseAdmin.js).
   - Both transform stored report content using [lib/parseReportContent.js](lib/parseReportContent.js).
   - Both stream generated binary documents as downloadable attachments.

## 3. Core Workflow (Entry Point to Final Output)

### 3.1 Public Report Authoring Lifecycle

1. User opens [app/page.js](app/page.js).
2. The page fetches active clients and assigned report forms.
3. [components/SelectionGate.js](components/SelectionGate.js) restores last client selection from local storage and displays assigned report templates.
4. SelectionGate checks existing report status for the selected client/form through [app/api/reports/status/route.js](app/api/reports/status/route.js).
5. User starts authoring; [app/page.js](app/page.js) calls `setSelection` in [store/useReportStore.js](store/useReportStore.js).
6. Store `initReport()` performs:
6. Store `initReport()` performs:
   - `GET /api/reports?clientId=...&formId=...` to load an existing draft.
   - `POST /api/reports` to create a new draft if none exists.
7. As content changes, the page updates local document state and invokes store `autosave()` (debounced), which issues `PUT /api/reports`.
8. User can submit report via store `submitReport()`, which sets status to `submitted` using `PUT /api/reports`.

### 3.2 Admin Oversight and Export Lifecycle

1. Admin authenticates through [app/admin/(auth)/login/page.js](app/admin/(auth)/login/page.js) and [app/api/admin-login/route.js](app/api/admin-login/route.js).
2. Protected route access is enforced by [middleware.js](middleware.js) and server-level checks in [lib/adminAuth.js](lib/adminAuth.js).
3. Dashboard [app/admin/(dashboard)/page.js](app/admin/(dashboard)/page.js) loads report rows and client-name mappings from Firestore.
4. [components/DashboardTable.js](components/DashboardTable.js) supports search, filter, sorting, preview, and deletion.
5. Preview modal [components/ReportPreviewModal.js](components/ReportPreviewModal.js) pulls full report content from [app/api/reports/[id]/route.js](app/api/reports/[id]/route.js).
6. Admin triggers export:
   - PDF via [app/api/export-pdf/route.js](app/api/export-pdf/route.js)
   - DOCX via [app/api/export-docx/route.js](app/api/export-docx/route.js)
7. Export routes parse the stored content model and return binary files with content-disposition filenames for download.

### 3.3 Client/Period Configuration Lifecycle

1. Admin navigates to [app/admin/(dashboard)/clients/page.js](app/admin/(dashboard)/clients/page.js) or [app/admin/(dashboard)/reports/page.js](app/admin/(dashboard)/reports/page.js).
2. Server Actions create/update/delete/toggle `clients` and `report_forms` documents.
3. Revalidation updates admin views immediately.
4. Public selector flow consumes these changes on subsequent fetches from `/api/clients` and `/api/months`.

## 4. Key Components and Responsibilities

## 4.1 Root and Configuration

- [next.config.mjs](next.config.mjs): Next.js build/runtime configuration.
- [middleware.js](middleware.js): Global request guard for admin and export routes.
- [jsconfig.json](jsconfig.json): JavaScript tooling configuration.
- [postcss.config.mjs](postcss.config.mjs): Tailwind/PostCSS pipeline configuration.

## 4.2 App Router (`app/`)

- [app/layout.js](app/layout.js): Root shell for global styling and page frame.
- [app/page.js](app/page.js): Public report authoring orchestration (selection, editing, saving, submission).
- [app/admin/layout.js](app/admin/layout.js): Top-level admin layout boundary.
- [app/admin/(auth)/layout.js](app/admin/(auth)/layout.js): Layout for auth pages.
- [app/admin/(auth)/login/page.js](app/admin/(auth)/login/page.js): Login surface for admin session creation.
- [app/admin/(dashboard)/layout.js](app/admin/(dashboard)/layout.js): Layout for dashboard pages.
- [app/admin/(dashboard)/page.js](app/admin/(dashboard)/page.js): Report operations dashboard.
- [app/admin/(dashboard)/clients/page.js](app/admin/(dashboard)/clients/page.js): Client master-data management.
- [app/admin/(dashboard)/reports/page.js](app/admin/(dashboard)/reports/page.js): Report template (form) management with visual builder.

## 4.3 API Layer (`app/api/`)

- [app/api/reports/route.js](app/api/reports/route.js): Report draft lifecycle (`GET`, `POST`, `PUT`).
- [app/api/reports/[id]/route.js](app/api/reports/[id]/route.js): Single-report retrieval for preview.
- [app/api/reports/status/route.js](app/api/reports/status/route.js): Form status availability for selection gate.
- [app/api/report-forms/route.js](app/api/report-forms/route.js): Active report form lookup.
- [app/api/admin-login/route.js](app/api/admin-login/route.js): Session creation.
- [app/api/admin-logout/route.js](app/api/admin-logout/route.js): Session termination.
- [app/api/export-pdf/route.js](app/api/export-pdf/route.js): PDF generation endpoint.
- [app/api/export-docx/route.js](app/api/export-docx/route.js): DOCX generation endpoint.

## 4.4 UI Components (`components/`)

- [components/SelectionGate.js](components/SelectionGate.js): User entry gate for selecting client + report form and handling submission status.
- [components/FormBuilderModal.js](components/FormBuilderModal.js): Visual interface for admins to build report schemas without JSON.
- [components/EditorWorkspace.js](components/EditorWorkspace.js): Authoring workspace shell with status indicators.
- [components/RichTextEditor.js](components/RichTextEditor.js): Tiptap-based editor module (available in codebase for rich text workflow compatibility).
- [components/DashboardTable.js](components/DashboardTable.js): Admin list with filtering/sorting and action controls.
- [components/ReportPreviewModal.js](components/ReportPreviewModal.js): Modal preview, print, and export actions.
- [components/ClientSelector.js](components/ClientSelector.js): Shared client selection helper.

## 4.5 Shared Libraries (`lib/`)

- [lib/firebaseAdmin.js](lib/firebaseAdmin.js): Firestore admin client bootstrap.
- [lib/firebaseClient.js](lib/firebaseClient.js): Client SDK bootstrap.
- [lib/adminSession.js](lib/adminSession.js): Session token format/parsing helpers.
- [lib/adminAuth.js](lib/adminAuth.js): Server-level authorization guards.
- [lib/reportMapping.js](lib/reportMapping.js): Conversion between keyed values and document model.
- [lib/parseReportContent.js](lib/parseReportContent.js): Document-content parser for rendering/export.

## 4.6 State Management (`store/`)

- [store/useReportStore.js](store/useReportStore.js): Central report state and side-effect boundary (`initReport`, `autosave`, `submitReport`, and selection/reset behavior).

## 5. Data Model and Persistence

Firestore collections inferred from API and admin pages:

- `reports`: report payload, client link, form link (form_id), status, timestamps.
- `clients`: client name and active flag.
- `report_forms`: form name, description, visual schema (fields), assigned clients, and active flag.

Persistence flow:

1. UI writes through API routes or server actions.
2. API/server actions use [lib/firebaseAdmin.js](lib/firebaseAdmin.js).
3. Read models are normalized in admin pages or directly consumed by UI components.

## 6. Operational Characteristics

- Autosave is debounced in the authoring flow to reduce write frequency.
- Session protection is layered (middleware + server-level auth assertions).
- Export endpoints are protected and require valid admin session cookies.
- Admin management pages revalidate route output after mutations for fresh UI state.

## 7. Notes for Maintainers

1. Keep [SUMMARY.md](SUMMARY.md) aligned with any structural changes in routes, store contracts, or export/auth behavior.
2. Keep the persistent repository summary reference in sync whenever architecture or workflow assumptions change.
3. Treat [app/page.js](app/page.js) as the source of truth for the active public editor workflow.
