import { revalidatePath } from "next/cache";
import { requireAdminSession, assertAdminSession } from "@/lib/adminAuth";
import { db, firebaseAdmin } from "@/lib/firebaseAdmin";
import ClientActions from "./ClientActions";

/* ─── Server Actions ──────────────────────────────── */
async function addClient(formData) {
  "use server";
  await assertAdminSession();
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Client name is required.");
  const now = new Date().toISOString();
  await db.collection("clients").add({ name, is_active: true, created_at: now });
  revalidatePath("/admin/clients");
}

async function editClient(formData) {
  "use server";
  await assertAdminSession();
  const clientId = String(formData.get("clientId") || "");
  const name     = String(formData.get("name") || "").trim();
  if (!clientId) throw new Error("Client ID is required.");
  if (!name)     throw new Error("Client name is required.");
  await db.collection("clients").doc(clientId).update({ name });
  revalidatePath("/admin/clients");
}

async function deleteClient(formData) {
  "use server";
  await assertAdminSession();
  const clientId = String(formData.get("clientId") || "");
  if (!clientId) throw new Error("Client ID is required.");
  await db.collection("clients").doc(clientId).delete();
  revalidatePath("/admin/clients");
}

async function toggleClientStatus(formData) {
  "use server";
  await assertAdminSession();
  const clientId  = String(formData.get("clientId") || "");
  const nextValue = formData.get("nextValue") === "true";
  if (!clientId) throw new Error("Client id is required.");
  await db.collection("clients").doc(clientId).update({ is_active: nextValue });
  revalidatePath("/admin/clients");
}

export const metadata = { title: "Clients — ReportGen Admin" };

/* ─── Avatar ──────────────────────────────────────── */
function Avatar({ name }) {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5D5FEF]/10 text-sm font-bold text-[#5D5FEF]">
      {initials || "?"}
    </div>
  );
}

/* ─── Page ────────────────────────────────────────── */
export default async function AdminClientsPage() {
  await requireAdminSession();

  let clients = [];
  let fetchError = null;

  try {
    const clientsSnap = await db.collection("clients").orderBy("name", "asc").get();
    clientsSnap.forEach((doc) => {
      clients.push({ id: doc.id, ...doc.data() });
    });
  } catch (err) {
    fetchError = err;
  }

  const active   = (clients || []).filter((c) => c.is_active).length;
  const inactive = (clients || []).filter((c) => !c.is_active).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#5D5FEF]">Management</p>
        <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-gray-800">Clients</h1>
        <p className="mt-1 text-sm text-gray-400">
          Manage client accounts — add, rename, activate, or remove clients.
        </p>
      </div>

      {/* Quick stats */}
      <div className="mb-5 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {active} Active
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-gray-100 bg-gray-50 px-3.5 py-1.5 text-xs font-semibold text-gray-500">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
          {inactive} Inactive
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#5D5FEF]/20 bg-[#5D5FEF]/5 px-3.5 py-1.5 text-xs font-semibold text-[#5D5FEF]">
          {(clients || []).length} Total
        </span>
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">

        {/* ── Add client card ──────────────────────── */}
        <div className="h-fit rounded-2xl bg-white p-5 sm:p-6 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5D5FEF]/10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5D5FEF" strokeWidth="2.2" strokeLinecap="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800">Add New Client</h2>
              <p className="text-xs text-gray-400">Client will be active by default</p>
            </div>
          </div>

          <form action={addClient} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Client name
              </label>
              <input
                id="name" name="name" type="text" required maxLength={80}
                placeholder="e.g. Acme Corp"
                className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-300 focus:border-[#5D5FEF]/40 focus:bg-white focus:ring-2 focus:ring-[#5D5FEF]/10"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-[#5D5FEF] py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200/50 transition hover:bg-indigo-600 active:scale-[0.98]"
            >
              Add client
            </button>
          </form>
        </div>

        {/* ── Client list card ─────────────────────── */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)]">

          {/* Card header */}
          <div className="flex items-center justify-between border-b border-gray-50 px-5 sm:px-6 py-4">
            <div>
              <h2 className="text-sm font-bold text-gray-800">All Clients</h2>
              <p className="text-xs text-gray-400 mt-0.5">Click Edit to rename · Delete to remove permanently</p>
            </div>
          </div>

          {/* List */}
          {fetchError ? (
            <div className="px-6 py-5">
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-500">
                Failed to load clients: {fetchError.message}
              </div>
            </div>
          ) : clients?.length ? (
            <ul className="divide-y divide-gray-50">
              {clients.map((client) => (
                <li key={client.id} className="flex flex-col gap-3 px-5 sm:px-6 py-4 transition hover:bg-gray-50/50 sm:flex-row sm:items-center sm:justify-between">
                  {/* Left: avatar + info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={client.name} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-800 text-sm">{client.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${client.is_active ? "bg-emerald-400" : "bg-gray-300"}`} />
                        <span className="text-xs text-gray-400">{client.is_active ? "Active" : "Inactive"}</span>

                        {/* Toggle status */}
                        <form action={toggleClientStatus} className="ml-1">
                          <input type="hidden" name="clientId" value={client.id} />
                          <input type="hidden" name="nextValue" value={client.is_active ? "false" : "true"} />
                          <button type="submit" className="text-[0.65rem] font-semibold text-gray-400 underline-offset-2 hover:underline transition">
                            {client.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>

                  {/* Right: action buttons */}
                  <ClientActions
                    client={client}
                    editAction={editClient}
                    deleteAction={deleteClient}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <svg className="h-5 w-5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-400">No clients yet.</p>
              <p className="text-xs text-gray-300 mt-1">Add your first client using the form on the left.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
