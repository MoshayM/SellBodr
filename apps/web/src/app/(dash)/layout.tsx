'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { clearAuth, getUser } from '@/lib/api';
import { PWAInstallBanner } from '@/components/ui/PWAInstallBanner';

const NAV = [
  { href: '/opportunities',  label: 'Opportunities',  icon: '🎯', badge: null },
  { href: '/research',       label: 'Research',        icon: '🔬', badge: null },
  { href: '/suppliers',      label: 'Suppliers',       icon: '🏭', badge: null },
  { href: '/marketplace',    label: 'Marketplace',     icon: '🛒', badge: null },
  { href: '/profitability',  label: 'Profitability',   icon: '💰', badge: null },
  { href: '/listing',        label: 'AI Listing',      icon: '📝', badge: 'NEW' },
  { href: '/recommendation', label: 'Recommendation',  icon: '🤖', badge: null },
  { href: '/reports',        label: 'Reports',         icon: '📊', badge: null },
  { href: '/settings',       label: 'Settings',        icon: '⚙️', badge: null },
];

const BOTTOM_NAV = [
  { href: '/opportunities',  label: 'Scout',    icon: '🎯' },
  { href: '/research',       label: 'Research', icon: '🔬' },
  { href: '/marketplace',    label: 'Markets',  icon: '🛒' },
  { href: '/recommendation', label: 'AI',       icon: '🤖' },
];

function NavItem({ href, label, icon, badge, onClick }: { href: string; label: string; icon: string; badge?: string | null; onClick?: () => void }) {
  const path    = usePathname();
  const active  = path === href || path.startsWith(href + '/');
  return (
    <Link href={href} onClick={onClick}
      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
        active
          ? 'bg-gradient-to-r from-violet-600/20 to-indigo-600/10 text-white border border-violet-500/20'
          : 'text-white/45 hover:text-white hover:bg-white/5'
      }`}>
      {active && <motion.div layoutId="sidebar-pill" className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-600/15 to-indigo-600/8 border border-violet-500/20" />}
      <span className="text-base relative z-10">{icon}</span>
      <span className="relative z-10">{label}</span>
      {badge && (
        <span className="ml-auto relative z-10 text-[10px] leading-none font-bold px-1.5 py-1 rounded-md bg-violet-600 text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function DashLayout({ children }: { children: React.ReactNode }) {
  const router    = useRouter();
  const path      = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser]         = useState<{ name?: string; role?: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('bs_access_token');
    if (!token) { router.replace('/login'); return; }
    setUser(getUser());
  }, [router]);

  useEffect(() => { setMenuOpen(false); }, [path]);

  function logout() { clearAuth(); router.push('/login'); }

  const initials = user?.name ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : 'U';
  const pageName = NAV.find(n => path === n.href || path.startsWith(n.href + '/'))?.label ?? 'SellBodr';

  return (
    <div className="flex h-screen bg-[#020817] overflow-hidden">

      {/* ── Desktop sidebar (lg+) ──────────────────────────────── */}
      <aside className="hidden lg:flex w-60 xl:w-64 bg-[#0A0F1E] border-r border-white/5 flex-col shrink-0">

        {/* Logo */}
        <div className="px-4 h-16 border-b border-white/5 flex items-center">
          <Link href="/opportunities" className="flex items-center gap-2.5">
            <img src="/icons/icon.svg" alt="SellBodr" className="w-8 h-8 rounded-lg shadow-lg shadow-violet-500/40 shrink-0" />
            <div>
              <div className="text-sm font-black text-white">SellBodr</div>
              <div className="text-[10px] text-white/30 -mt-0.5">Intelligence Platform</div>
            </div>
          </Link>
        </div>

        {/* Search (future) */}
        <div className="px-3 pt-4 pb-2">
          <div className="flex items-center gap-2 bg-white/4 hover:bg-white/6 border border-white/6 rounded-xl px-3 py-2 text-sm text-white/30 cursor-text transition-colors">
            <span>🔍</span>
            <span className="text-xs">Search everything...</span>
            <span className="ml-auto text-[10px] leading-none glass rounded px-1.5 py-1 border border-white/8">⌘K</span>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 pb-3 space-y-0.5 overflow-y-auto scrollbar-dark">
          <div className="text-[10px] font-semibold text-white/20 uppercase tracking-widest px-3 py-2 mt-2">Main</div>
          {NAV.slice(0, 5).map(n => <NavItem key={n.href} {...n} />)}
          <div className="text-[10px] font-semibold text-white/20 uppercase tracking-widest px-3 py-2 mt-3">Tools</div>
          {NAV.slice(5).map(n => <NavItem key={n.href} {...n} />)}
        </nav>

        {/* User section */}
        <div className="px-3 pb-3 border-t border-white/5 pt-3">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/4 transition-colors group mb-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white/80 truncate">{user?.name ?? 'User'}</div>
              <div className="text-[10px] text-white/30 capitalize">{user?.role ?? 'member'} · Pro</div>
            </div>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-white/30 hover:text-red-400 hover:bg-red-500/8 transition-all duration-200 min-h-[40px]">
            <span>↩</span><span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ─────────────────────────────────────── */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 glass border-b border-white/5 flex items-center px-3 gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <img src="/icons/icon.svg" alt="SellBodr" className="w-7 h-7 rounded-lg shadow shadow-violet-500/30 shrink-0" />
          <span className="text-sm font-bold text-white truncate">{pageName}</span>
        </div>
        <div className="flex items-center gap-1">
          <Link href="/settings" aria-label="Settings"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-white/40 hover:bg-white/5 active:bg-white/10 transition-colors text-base">
            ⚙️
          </Link>
          <button onClick={() => setMenuOpen(true)} aria-label="Menu"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-white/40 hover:bg-white/5 active:bg-white/10 transition-colors">
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
              <rect width="18" height="2" rx="1" fill="currentColor"/>
              <rect y="6" width="14" height="2" rx="1" fill="currentColor"/>
              <rect y="12" width="18" height="2" rx="1" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ── Mobile slide-in menu ────────────────────────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-[#0A0F1E] border-r border-white/5 flex flex-col shadow-2xl">

              {/* Header */}
              <div className="flex items-center justify-between px-5 h-14 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2.5">
                  <img src="/icons/icon.svg" alt="SellBodr" className="w-7 h-7 rounded-lg shadow shadow-violet-500/30 shrink-0" />
                  <span className="text-sm font-bold text-white">SellBodr</span>
                </div>
                <button onClick={() => setMenuOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:bg-white/5 text-xl">
                  &times;
                </button>
              </div>

              {/* User row */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{user?.name ?? 'User'}</div>
                  <div className="text-xs text-white/30 capitalize">{user?.role ?? 'member'} · Pro plan</div>
                </div>
              </div>

              {/* Nav */}
              <nav className="flex-1 px-3 py-3 overflow-y-auto scrollbar-dark space-y-0.5">
                {NAV.map(n => <NavItem key={n.href} {...n} onClick={() => setMenuOpen(false)} />)}
              </nav>

              {/* Sign out */}
              <div className="px-3 pb-3 border-t border-white/5 pt-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                <button onClick={logout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/30 hover:text-red-400 hover:bg-red-500/8 transition-all">
                  <span className="text-base">↩</span>
                  Sign out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-dark">
        <div className="pt-14 pb-24 lg:pt-0 lg:pb-0 min-h-full">
          <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8">
            {children}
          </div>
        </div>
      </main>

      <PWAInstallBanner />

      {/* ── Mobile bottom nav ───────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 glass border-t border-white/5"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-stretch h-16">
          {BOTTOM_NAV.map(({ href, label, icon }) => {
            const active = path === href || path.startsWith(href + '/');
            return (
              <Link key={href} href={href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${active ? 'text-violet-400' : 'text-white/30 active:text-white/60'}`}>
                <span className={`text-xl leading-none transition-transform ${active ? 'scale-110' : ''}`}>{icon}</span>
                <span className="text-[10px] font-medium leading-none">{label}</span>
                {active && <div className="w-1 h-1 rounded-full bg-violet-400 mt-0.5" />}
              </Link>
            );
          })}
          <button onClick={() => setMenuOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-white/30 active:text-white/60 transition-colors">
            <span className="text-xl leading-none">☰</span>
            <span className="text-[10px] font-medium leading-none">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
