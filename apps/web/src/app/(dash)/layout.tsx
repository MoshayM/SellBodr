'use client';
import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { clearAuth, getUser, isAdmin } from '@/lib/api';
import { getWishlistCount } from '@/lib/wishlist';
import { CurrencyWidget } from '@/components/ui/CurrencyWidget';

type NavPage = { href: string; label: string; icon: string; desc: string; badge?: string; adminOnly?: boolean };

const ALL_PAGES: NavPage[] = [
  { href: '/opportunities',        label: 'Opportunities',    icon: '🎯', desc: 'AI-scored cross-border products' },
  { href: '/research',             label: 'Research',          icon: '🔬', desc: 'Deep market intelligence & trends' },
  { href: '/suppliers',            label: 'Suppliers',         icon: '🏭', desc: 'India supplier sourcing database' },
  { href: '/marketplace',          label: 'Marketplace',       icon: '🛒', desc: 'Compare 76+ global marketplaces' },
  { href: '/profitability',        label: 'Profitability',     icon: '💰', desc: 'Full landed-cost profit model' },
  { href: '/listing',              label: 'AI Listing',        icon: '📝', desc: 'Generate SEO-optimised listings', badge: 'NEW' },
  { href: '/gap-finder',           label: 'Gap Finder',        icon: '🔍', desc: 'Find high-demand niches with weak competition', badge: 'NEW' },
  { href: '/keyword-intelligence', label: 'Keywords',          icon: '🔤', desc: 'Deep keyword research & search intelligence' },
  { href: '/bulk-scan',            label: 'Bulk Scan',         icon: '⚡', desc: 'Scan multiple products at once (Pro)' },
  { href: '/team',                 label: 'Team',              icon: '👥', desc: 'Manage team members and invitations' },
  { href: '/recommendation',       label: 'Recommendations',   icon: '🤖', desc: 'AI-curated opportunity picks' },
  { href: '/reports',              label: 'Reports',           icon: '📊', desc: 'Export and analyse your data' },
  { href: '/wishlist',             label: 'Wishlist',          icon: '🌟', desc: 'Saved & bookmarked opportunities' },
  { href: '/settings',             label: 'Settings',          icon: '⚙️', desc: 'Account & preferences' },
  { href: '/ai-keys',              label: 'AI Provider Keys',  icon: '🔑', desc: 'Manage AI model API keys', adminOnly: true },
];

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  );
}

function GuideIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  );
}

export default function DashLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const path     = usePathname();
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [anchor,       setAnchor]       = useState<DOMRect | null>(null);
  const [mounted,      setMounted]      = useState(false);
  const [user, setUser] = useState<{ name?: string; role?: string; plan?: string } | null>(null);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [authChecked, setAuthChecked] = useState(false);

  const userMenuRef     = useRef<HTMLDivElement>(null);
  const desktopWrapRef  = useRef<HTMLDivElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileBtnRef    = useRef<HTMLButtonElement>(null);
  const searchInputRef  = useRef<HTMLInputElement>(null);
  const [fromDesktop, setFromDesktop] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  /* Auth guard */
  useEffect(() => {
    const token = localStorage.getItem('bs_access_token');
    if (!token) { router.replace('/login'); return; }
    setUser(getUser());
    setAuthChecked(true);
  }, [router]);

  useEffect(() => { setMenuOpen(false); }, [path]);

  /* Wishlist sync */
  useEffect(() => {
    setWishlistCount(getWishlistCount());
    const sync = () => setWishlistCount(getWishlistCount());
    window.addEventListener('bs:wishlist', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('bs:wishlist', sync); window.removeEventListener('storage', sync); };
  }, []);

  /* Close user menu on outside click */
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    }
    if (userMenuOpen) document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [userMenuOpen]);

  /* ⌘K global shortcut */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (window.innerWidth >= 768) {
          desktopInputRef.current?.focus();
          const rect = desktopWrapRef.current?.getBoundingClientRect();
          if (rect) { setAnchor(rect); setFromDesktop(true); setSearchOpen(true); }
        } else {
          const ref = mobileBtnRef.current;
          if (ref) { setSearchQuery(''); setAnchor(ref.getBoundingClientRect()); setFromDesktop(false); setSearchOpen(true); }
        }
      }
      if (e.key === 'Escape') closeSearch();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchOpen && !fromDesktop) setTimeout(() => searchInputRef.current?.focus(), 40);
  }, [searchOpen, fromDesktop]);

  function openSearch(rect: DOMRect, isDesktop = false) {
    setAnchor(rect); setFromDesktop(isDesktop); setSearchOpen(true);
  }
  function closeSearch() { setSearchOpen(false); setSearchQuery(''); }
  function logout() { clearAuth(); setUser(null); router.replace('/login'); }

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';
  const pageName = ALL_PAGES.find(n => path === n.href || path.startsWith(n.href + '/'))?.label ?? 'SellBodr';
  const isHome   = path === '/opportunities' || path.startsWith('/opportunities/');
  const navPages = ALL_PAGES.filter(p => !p.adminOnly || isAdmin());
  const searchResults = searchQuery.trim()
    ? navPages.filter(p =>
        p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.desc.toLowerCase().includes(searchQuery.toLowerCase()))
    : navPages;

  if (!authChecked) {
    return (
      <div className="dash-area min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin" />
          <span className="text-sm text-slate-400">Loading…</span>
        </div>
      </div>
    );
  }

  /* ── Search dropdown (portal) ───────────────────────────── */
  const searchDropdown = searchOpen && mounted && anchor ? createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={closeSearch} />
      <div
        className="fixed z-50 rounded-2xl overflow-hidden"
        style={{
          top:      anchor.bottom + 6,
          left:     anchor.width < 80 ? Math.max(8, anchor.right - 380) : anchor.left,
          width:    anchor.width < 80 ? Math.min(380, window.innerWidth - 16) : Math.max(anchor.width, 400),
          maxWidth: window.innerWidth - 16,
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 8px 32px rgba(15,23,42,0.12), 0 2px 8px rgba(15,23,42,0.06)',
        }}>

        {!fromDesktop && (
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-slate-100">
            <span className="text-slate-400 shrink-0"><SearchIcon /></span>
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search pages & features…"
              className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none min-w-0"
            />
            <kbd className="text-slate-400 text-[10px] border border-slate-200 rounded px-1.5 py-0.5 font-mono shrink-0">ESC</kbd>
          </div>
        )}

        <div className="py-1 max-h-72 overflow-y-auto scrollbar-dark">
          {searchResults.length === 0 ? (
            <div className="px-4 py-5 text-center text-sm text-slate-400">
              No results for &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            <>
              <div className="px-3.5 pt-2.5 pb-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                {searchQuery ? 'Results' : 'All pages'}
              </div>
              {searchResults.map(p => {
                const active = path === p.href || path.startsWith(p.href + '/');
                return (
                  <button key={p.href}
                    onClick={() => { router.push(p.href); closeSearch(); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 transition-colors text-left group ${
                      active ? 'bg-violet-50' : 'hover:bg-slate-50'
                    }`}>
                    <span className="text-lg w-7 text-center shrink-0">{p.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium leading-snug ${
                        active ? 'text-violet-700' : 'text-slate-700 group-hover:text-slate-900'
                      }`}>
                        {p.label}
                        {p.badge && (
                          <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)', color: '#fff' }}>
                            {p.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">{p.desc}</div>
                    </div>
                    <span className={`text-xs shrink-0 ${
                      active ? 'text-violet-400' : 'text-slate-200 group-hover:text-slate-400'
                    }`}>
                      {active ? '●' : '→'}
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>

        <div className="px-3.5 py-2 border-t border-slate-100 flex items-center gap-3 text-[10px] text-slate-400">
          <span><kbd className="font-mono border border-slate-200 rounded px-1 py-0.5">⌘K</kbd> toggle</span>
          <span><kbd className="font-mono border border-slate-200 rounded px-1 py-0.5">↵</kbd> open</span>
          <span><kbd className="font-mono border border-slate-200 rounded px-1 py-0.5">ESC</kbd> close</span>
        </div>
      </div>
    </>,
    document.body
  ) : null;

  return (
    <div className="dash-area min-h-screen flex flex-col">

      {/* ── Top navigation bar ── */}
      <header
        className="fixed top-0 inset-x-0 z-30 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 lg:px-6 border-b bg-white"
        style={{
          height: 'calc(56px + env(safe-area-inset-top, 0px))',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          borderColor: '#E2E8F0',
          boxShadow: '0 1px 0 #E2E8F0, 0 4px 24px rgba(15,23,42,0.05)',
        }}>

        {/* Logo */}
        <Link href="/opportunities" className="flex items-center gap-2.5 shrink-0 group" aria-label="SellBodr home">
          <img src="/icons/icon.svg" alt="SellBodr"
            className="w-9 h-9 transition-transform duration-200 group-hover:scale-110 shrink-0"
            style={{ filter: 'drop-shadow(0 0 6px rgba(124,58,237,0.5))' }} />
          <div className="hidden sm:block">
            <div className="text-[14px] font-black tracking-tight leading-none"
              style={{ background: 'linear-gradient(135deg,#7c3aed 0%,#6366f1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              SellBodr
            </div>
            <div className="text-[8px] font-semibold text-slate-400 uppercase tracking-[0.18em] leading-none mt-0.5">
              eCommerce Intelligence
            </div>
          </div>
        </Link>

        {/* Page title — mobile only */}
        <span className="sm:hidden text-sm font-semibold text-slate-500 truncate flex-1 min-w-0 pl-1">{pageName}</span>

        {/* Desktop search bar */}
        <div className="hidden md:flex flex-1 justify-center max-w-xl">
          <div ref={desktopWrapRef} className="w-full max-w-md">
            <div className={`flex items-center gap-2.5 rounded-xl px-4 py-2 transition-all duration-200 border ${
              searchOpen && fromDesktop
                ? 'bg-white border-violet-400/60 shadow-sm ring-2 ring-violet-500/10'
                : 'bg-slate-50 hover:bg-white border-slate-200 hover:border-slate-300'
            }`}>
              <span className="text-slate-400 shrink-0"><SearchIcon /></span>
              <input
                ref={desktopInputRef}
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  if (!searchOpen) {
                    const rect = desktopWrapRef.current?.getBoundingClientRect();
                    if (rect) { setAnchor(rect); setFromDesktop(true); setSearchOpen(true); }
                  }
                }}
                onFocus={() => {
                  const rect = desktopWrapRef.current?.getBoundingClientRect();
                  if (rect) { setAnchor(rect); setFromDesktop(true); setSearchOpen(true); }
                }}
                placeholder="Search everything…"
                className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none min-w-0"
                aria-label="Search (⌘K)"
              />
              <kbd className="text-[10px] bg-slate-100 rounded px-1.5 py-1 border border-slate-200 font-mono text-slate-500 shrink-0">⌘K</kbd>
            </div>
          </div>
        </div>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">

          {/* Mobile search */}
          <button
            ref={mobileBtnRef}
            onClick={e => openSearch((e.currentTarget as HTMLButtonElement).getBoundingClientRect())}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition-colors touch-manipulation"
            aria-label="Search">
            <SearchIcon />
          </button>

          {/* Wishlist */}
          <Link href="/wishlist"
            className={`hidden md:flex relative w-9 h-9 items-center justify-center rounded-xl transition-colors touch-manipulation ${
              path === '/wishlist'
                ? 'bg-amber-100 text-amber-600'
                : 'text-slate-500 hover:bg-slate-100 hover:text-amber-500'
            }`}
            aria-label="Wishlist">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
              <path d="M2 2.75A2.75 2.75 0 0 1 4.75 0h6.5A2.75 2.75 0 0 1 14 2.75v12.5a.75.75 0 0 1-1.175.619L8 13.075l-4.825 2.694A.75.75 0 0 1 2 15.25V2.75Z" />
            </svg>
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-black bg-amber-500 text-white leading-none shadow-sm">
                {wishlistCount > 99 ? '99+' : wishlistCount}
              </span>
            )}
          </Link>

          {/* User Guide */}
          <Link href="/guide"
            className={`hidden md:flex w-9 h-9 items-center justify-center rounded-xl transition-colors touch-manipulation ${
              path === '/guide' || path.startsWith('/guide/')
                ? 'bg-violet-100 text-violet-700'
                : 'text-slate-400 hover:bg-slate-100 hover:text-violet-600'
            }`}
            aria-label="User Guide">
            <GuideIcon />
          </Link>

          {/* User avatar menu */}
          {user && (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(v => !v)}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs transition-transform duration-150 hover:scale-105 active:scale-95 touch-manipulation shadow-sm"
                aria-label="User menu" aria-expanded={userMenuOpen}>
                {initials}
              </button>
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: -6 }}
                    transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                    className="absolute right-0 top-11 bg-white border border-slate-200 rounded-2xl p-1.5 min-w-[200px] z-50"
                    style={{ boxShadow: '0 8px 32px rgba(15,23,42,0.12), 0 2px 8px rgba(15,23,42,0.06)' }}>
                    <div className="px-3 py-2.5 border-b border-slate-100 mb-1">
                      <div className="text-xs font-semibold text-slate-800 truncate">{user?.name ?? 'User'}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-slate-400 capitalize">{user?.role ?? 'member'}</span>
                        {user?.role === 'admin'
                          ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">Admin</span>
                          : user?.plan === 'pro'
                            ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">Pro</span>
                            : <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">Free</span>
                        }
                      </div>
                    </div>
                    {isAdmin() && (
                      <>
                        <Link href="/admin" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors">
                          <span>🔐</span><span>Admin Panel</span>
                        </Link>
                        <Link href="/ai-keys" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-colors">
                          <span>🔑</span><span>AI Provider Keys</span>
                        </Link>
                      </>
                    )}
                    <Link href="/guide" onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors">
                      <span>📖</span><span>User Guide</span>
                    </Link>
                    <Link href="/settings" onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors">
                      <span>⚙️</span><span>Settings</span>
                    </Link>
                    <button onClick={logout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all min-h-[40px]">
                      <span>↩</span><span>Sign out</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

        </div>
      </header>

      {searchDropdown}

      {/* ── Mobile slide-in drawer ── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)} />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="md:hidden fixed inset-y-0 right-0 z-50 w-[280px] sm:w-72 bg-white border-l border-slate-200 flex flex-col shadow-2xl"
              style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>

              <div className="flex items-center justify-between px-5 h-14 border-b border-slate-100 shrink-0">
                <span className="text-sm font-bold text-slate-500">All pages</span>
                <button onClick={() => setMenuOpen(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 text-xl touch-manipulation"
                  aria-label="Close menu">&times;</button>
              </div>

              {user && (
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">{user.name ?? 'User'}</div>
                    <div className="text-xs text-slate-400 capitalize">
                      {user.plan === 'pro' ? 'Pro' : user.role === 'admin' ? 'Admin' : 'Free'} account
                    </div>
                  </div>
                </div>
              )}

              <nav className="flex-1 px-3 py-3 overflow-y-auto scrollbar-dark space-y-0.5" aria-label="Navigation">
                {navPages.map(p => {
                  const active = path === p.href || path.startsWith(p.href + '/');
                  return (
                    <Link key={p.href} href={p.href} onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        active
                          ? 'text-violet-700 bg-violet-50'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                      style={active ? { boxShadow: 'inset 3px 0 0 rgba(124,58,237,0.45)' } : undefined}>
                      <span className="text-base w-6 text-center shrink-0">{p.icon}</span>
                      <span className="flex-1 truncate">{p.label}</span>
                      {'badge' in p && p.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                          style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)', color: '#fff' }}>
                          {p.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              <div className="px-3 pt-3 border-t border-slate-100"
                style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                <button onClick={() => { logout(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all min-h-[44px] touch-manipulation">
                  <span>↩</span><span>Sign out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-dark">
        <div className="min-h-full"
          style={{ paddingTop: 'calc(56px + env(safe-area-inset-top, 0px))', paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}>
          <div className="md:pb-6 max-w-7xl mx-auto p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8">
            {children}
          </div>
        </div>
      </main>

      <CurrencyWidget />

      {/* ── Mobile bottom tab bar ── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          boxShadow: '0 -1px 0 #E2E8F0, 0 -4px 16px rgba(15,23,42,0.06)',
        }}
        aria-label="Bottom navigation">
        <div className="flex items-stretch h-16">

          <Link href="/opportunities"
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-200 relative touch-manipulation ${
              isHome ? 'text-violet-600' : 'text-slate-400 active:text-slate-600'
            }`}>
            {isHome && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" />
            )}
            <span className={`text-[22px] leading-none transition-transform duration-200 ${isHome ? 'scale-110' : ''}`}>🎯</span>
            <span className={`text-[10px] font-semibold leading-none ${isHome ? 'text-violet-600' : ''}`}>Scout</span>
          </Link>

          <Link href="/wishlist"
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-200 relative touch-manipulation ${
              path === '/wishlist' ? 'text-amber-500' : 'text-slate-400 active:text-slate-600'
            }`}>
            {path === '/wishlist' && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400" />
            )}
            <span className={`text-[22px] leading-none transition-transform duration-200 ${path === '/wishlist' ? 'scale-110' : ''}`}>🌟</span>
            <span className={`text-[10px] font-semibold leading-none ${path === '/wishlist' ? 'text-amber-500' : ''}`}>Wishlist</span>
          </Link>

          <button
            onClick={() => setMenuOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-slate-400 active:text-slate-600 transition-colors touch-manipulation"
            aria-label="More pages">
            <svg width="20" height="16" viewBox="0 0 20 16" fill="none" aria-hidden="true">
              <rect width="20" height="2" rx="1" fill="currentColor"/>
              <rect y="7" width="16" height="2" rx="1" fill="currentColor"/>
              <rect y="14" width="20" height="2" rx="1" fill="currentColor"/>
            </svg>
            <span className="text-[10px] font-medium leading-none">More</span>
          </button>

        </div>
      </nav>
    </div>
  );
}
