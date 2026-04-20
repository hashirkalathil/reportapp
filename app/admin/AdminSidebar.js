'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

/* ── Icons ─────────────────────────────── */
const IconGrid = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/>
    <rect x="3" y="14" width="7" height="7" rx="1.2"/><rect x="14" y="14" width="7" height="7" rx="1.2"/>
  </svg>
);
const IconUsers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const IconCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const NAV = [
  { href: "/admin",         label: "Dashboard", Icon: IconGrid  },
  { href: "/admin/clients", label: "Clients",   Icon: IconUsers },
  { href: "/admin/reports", label: "Report Forms", Icon: IconCalendar },
];

export default function AdminSidebar() {
  const pathname      = usePathname();
  const router        = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try { await fetch("/api/admin-logout", { method: "POST" }); }
    finally { router.push("/admin/login"); router.refresh(); setLoading(false); }
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-[#1C2434] min-h-screen">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-7">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#5D5FEF]">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </div>
        <div>
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.15em] text-[#5D5FEF]">Admin</p>
          <p className="text-sm font-bold text-white">ReportGen</p>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/6" />

      {/* Nav label */}
      <p className="mt-6 px-6 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-white/30">Menu</p>

      {/* Nav items */}
      <nav className="mt-2 flex flex-col gap-0.5 px-3">
        {NAV.map(({ href, label, Icon }) => {
          const isActive = href === "/admin"
            ? pathname === "/admin"
            : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={[
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:bg-white/5 hover:text-white/80",
              ].join(" ")}
            >
              <span className={isActive ? "text-[#5D5FEF]" : "text-white/30 group-hover:text-white/50"}>
                <Icon />
              </span>
              <span className="flex-1">{label}</span>
              {isActive && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#5D5FEF]"
                  style={{ boxShadow: "0 0 6px #5D5FEF" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer help card */}
      <div className="mx-4 mb-4 rounded-2xl bg-white/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5D5FEF" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p className="text-xs font-semibold text-white/70">Having troubles?</p>
        </div>
        <p className="text-[0.68rem] text-white/30 leading-relaxed">Contact your system administrator for help with access issues.</p>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/6" />

      {/* Logout */}
      <div className="p-3">
        <button
          onClick={handleLogout}
          disabled={loading}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/40 transition hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconLogout />
          {loading ? "Logging out…" : "Logout"}
        </button>
      </div>
    </aside>
  );
}
