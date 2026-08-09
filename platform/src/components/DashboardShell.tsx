"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

export interface NavItem {
  href: string;
  label: string;
}

export function DashboardShell({
  navItems,
  roleLabel,
  children,
}: {
  navItems: NavItem[];
  roleLabel: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <aside className="hidden md:flex md:w-60 md:flex-col bg-ink-950 text-slate-200 shrink-0">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-white/10">
          <div className="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center font-bold text-white">K</div>
          <span className="font-semibold text-white">Konsinye</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-brand-600 text-white" : "text-slate-300 hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-white/10 text-xs text-slate-400">
          <div className="uppercase tracking-wide">{roleLabel}</div>
          <div className="text-slate-300 truncate">{session?.user?.name}</div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-2 text-brand-400 hover:underline"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="md:hidden h-14 bg-ink-950 text-white flex items-center justify-between px-4 sticky top-0 z-10">
          <span className="font-semibold">Konsinye</span>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-xs text-brand-400">
            Sign out
          </button>
        </header>
        <main className="p-4 md:p-8 max-w-7xl">{children}</main>
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 flex overflow-x-auto z-10">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 text-center py-3 text-xs font-medium whitespace-nowrap px-3 ${
                  active ? "text-brand-600" : "text-slate-500"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="h-16 md:hidden" />
      </div>
    </div>
  );
}
