'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { clearAuth, getUser } from '@/lib/api';

const NAV = [
  { href: '/opportunities',  label: 'Opportunities', icon: '🎯' },
  { href: '/research',       label: 'Research',       icon: '🔬' },
  { href: '/suppliers',      label: 'Suppliers',      icon: '🏭' },
  { href: '/marketplace',    label: 'Marketplace',    icon: '🛒' },
  { href: '/profitability',  label: 'Profitability',  icon: '💰' },
  { href: '/listing',        label: 'Listing',        icon: '📝' },
  { href: '/recommendation', label: 'Recommendation', icon: '🤖' },
  { href: '/reports',        label: 'Reports',        icon: '📊' },
  { href: '/settings',       label: 'Settings',       icon: '⚙️' },
];

const BOTTOM_NAV = [
  { href: '/opportunities',  label: 'Scout',    icon: '🎯' },
  { href: '/research',       label: 'Research', icon: '🔬' },
  { href: '/marketplace',    label: 'Markets',  icon: '🛒' },
  { href: '/recommendation', label: 'AI Picks', icon: '🤖' },
];

export default function DashLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path   = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<{ name?: string; role?: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('bs_access_token');
    if (!token) { router.replace('/login'); return; }
    setUser(getUser());
  }, [router]);

  useEffect(() => { setMenuOpen(false); }, [path]);

  function logout() { clearAuth(); router.push('/login'); }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Desktop sidebar (lg+) ─────────────────────────────── */}
      <aside className="hidden lg:flex w-60 bg-white border-r border-gray-200 flex-col shrink-0">
        <div className="p-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-green-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">B</span>
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">BorderScout AI</div>
              <div className="text-xs text-gray-400">Intelligence Platform</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon }) => {
            const active = path === href || path.startsWith(href + '/');
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}>
                <span className="text-base">{icon}</span>
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-200">
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs flex-shrink-0">
              {user?.name?.[0] ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-700 truncate">{user?.name ?? 'User'}</div>
              <div className="text-xs text-gray-400 capitalize">{user?.role ?? 'member'}</div>
            </div>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors min-h-[36px]">
            <span>↩</span><span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar (<lg) ──────────────────────────────── */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 bg-white border-b border-gray-200 flex items-center px-3 gap-1">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-7 h-7 bg-green-600 rounded-md flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">B</span>
          </div>
          <span className="text-sm font-bold text-gray-900 truncate">BorderScout AI</span>
        </div>
        <Link href="/settings" aria-label="Settings"
          className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors">
          ⚙️
        </Link>
        <button onClick={() => setMenuOpen(true)} aria-label="Menu"
          className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors">
          <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
            <rect width="20" height="2" rx="1" fill="currentColor"/>
            <rect y="7" width="20" height="2" rx="1" fill="currentColor"/>
            <rect y="14" width="20" height="2" rx="1" fill="currentColor"/>
          </svg>
        </button>
      </header>

      {/* ── Mobile slide-in menu (<lg) ────────────────────────── */}
      <div className={`lg:hidden fixed inset-0 z-40 transition-opacity duration-200 ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
        <div className={`absolute inset-y-0 left-0 w-72 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between px-5 h-14 border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-green-600 rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xs">B</span>
              </div>
              <span className="text-sm font-bold text-gray-900">BorderScout AI</span>
            </div>
            <button onClick={() => setMenuOpen(false)}
              className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-xl">
              &times;
            </button>
          </div>

          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm shrink-0">
              {user?.name?.[0] ?? 'U'}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-800 truncate">{user?.name ?? 'User'}</div>
              <div className="text-xs text-gray-400 capitalize">{user?.role ?? 'member'}</div>
            </div>
          </div>

          <nav className="flex-1 p-3 overflow-y-auto space-y-0.5">
            {NAV.map(({ href, label, icon }) => {
              const active = path === href || path.startsWith(href + '/');
              return (
                <Link key={href} href={href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${
                    active ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-600 active:bg-gray-50'
                  }`}>
                  <span className="text-lg w-7 text-center shrink-0">{icon}</span>
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-gray-100" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
            <button onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-500 active:bg-red-50">
              <span className="text-lg w-7 text-center shrink-0">↩</span>
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="pt-14 pb-20 lg:pt-0 lg:pb-0 min-h-full">
          <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-5 lg:p-6">
            {children}
          </div>
        </div>
      </main>

      {/* ── Mobile bottom nav (<lg) ───────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-stretch h-16">
          {BOTTOM_NAV.map(({ href, label, icon }) => {
            const active = path === href || path.startsWith(href + '/');
            return (
              <Link key={href} href={href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? 'text-green-600' : 'text-gray-400 active:text-gray-700'
                }`}>
                <span className={`text-xl leading-none ${active ? 'scale-110' : ''}`}>{icon}</span>
                <span className="text-[10px] font-medium leading-none mt-0.5">{label}</span>
              </Link>
            );
          })}
          <button onClick={() => setMenuOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-400 active:text-gray-700 transition-colors">
            <span className="text-xl leading-none">☰</span>
            <span className="text-[10px] font-medium leading-none mt-0.5">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
