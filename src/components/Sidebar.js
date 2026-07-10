"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const links = [
  {
    href: "/",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/overview",
    label: "Overview",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 19V9" />
        <path d="M12 19V5" />
        <path d="M20 19v-7" />
        <path d="M2 19h20" />
      </svg>
    ),
  },
  {
    href: "/details",
    label: "Details",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M8 6h13M8 12h13M8 18h13" />
        <circle cx="4" cy="6" r="1" fill="currentColor" />
        <circle cx="4" cy="12" r="1" fill="currentColor" />
        <circle cx="4" cy="18" r="1" fill="currentColor" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <aside className="glass fixed inset-x-0 top-0 z-20 flex items-center gap-1 px-3 py-2 md:inset-x-auto md:inset-y-4 md:left-4 md:w-60 md:flex-col md:items-stretch md:gap-0 md:rounded-3xl md:px-4 md:py-6">
      <div className="mr-2 flex items-center gap-2 md:mr-0 md:mb-8 md:px-2">
        <span className="text-2xl">🎱</span>
        <span className="text-lg font-bold tracking-tight">
          Pool <span className="serif-accent text-xl">Tracker</span>
        </span>
      </div>

      <nav className="flex flex-1 items-center gap-1 md:flex-none md:flex-col md:items-stretch md:gap-1.5">
        {links.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition md:px-4 md:py-2.5 ${
                active
                  ? "bg-emerald-400/15 text-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-emerald-400/30"
                  : "text-emerald-100/70 hover:bg-white/5 hover:text-emerald-100"
              }`}
            >
              {l.icon}
              <span className="hidden sm:inline">{l.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="md:mt-auto">
        <div className="mb-2 hidden px-2 text-xs text-emerald-100/40 md:block">
          Signed in as pool@gmail.com
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-red-300/80 transition hover:bg-red-500/15 hover:text-red-200 md:px-4 md:py-2.5"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5M21 12H9" />
          </svg>
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </aside>
  );
}
