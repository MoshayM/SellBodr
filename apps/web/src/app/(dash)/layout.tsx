'use client';
import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { clearAuth, getUser, isAdmin } from '@/lib/api';
import { getWishlistCount } from '@/lib/wishlist';
import { PWAInstallBanner } from '@/components/ui/PWAInstallBanner';
import { CurrencyWidget } from '@/components/ui/CurrencyWidget';
import { useTheme } from '@/components/ui/ThemeProvider';

type NavPage = { href: string; label: string; icon: string; desc: string; badge?: string; adminOnly?: boolean };

const ALL_PAGES: NavPage[] = [
  { href: '/opportunities',  label: 'Opportunities',  icon: '🎯', desc: 'AI-scored cross-border products' },
  { href: '/research',       label: 'Research',        icon: '🔬', desc: 'Deep market intelligence & trends' },
  { href: '/suppliers',      label: 'Suppliers',       icon: '🏭', desc: 'India supplier sourcing database' },
  { href: '/marketplace',    label: 'Marketplace',     icon: '🛒', desc: 'Compare 76+ global marketplaces' },
  { href: '/profitability',  label: 'Profitability',   icon: '💰', desc: 'Full landed-cost profit model' },
  { href: '/listing',        label: 'AI Listing',      icon: '📝', desc: 'Generate SEO-optimised listings', badge: 'NEW' },
  { href: '/gap-finder',           label: 'Gap Finder',   icon: '🔍', desc: 'Find high-demand niches with weak competition', badge: 'NEW' },
  { href: '/keyword-intelligence', label: 'Keywords',     icon: '🔤', desc: 'Deep keyword research & search intelligence' },
  { href: '/bulk-scan',            label: 'Bulk Scan',    icon: '⚡', desc: 'Scan multiple products at once (Pro)' },
  { href: '/team', label: 'Team', icon: '👥', desc: 'Manage team members and invitations' },
  { href: '/recommendation', label: 'Recommendations', icon: '🤖', desc: 'AI-curated opportunity picks' },
  { href: '/reports',        label: 'Reports',         icon: '📊', desc: 'Export and analyse your data' },
  { href: '/wishlist',       label: 'Wishlist',        icon: '🌟', desc: 'Saved & bookmarked opportunities' },
  { href: '/settings',       label: 'Settings',        icon: '⚙️', desc: 'Account & preferences' },
  { href: '/ai-keys',        label: 'AI Provider Keys', icon: '🔑', desc: 'Manage AI model API keys', adminOnly: true },
];

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
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
  const { theme, toggle: toggleTheme } = useTheme();
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [anchor,       setAnchor]       = useState<DOMRect | null>(null);
  const [mounted,      setMounted]      = useState(false);
  const [user, setUser] = useState<{ name?: string; role?: string; plan?: string } | null>(null);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [authChecked, setAuthChecked] = useState(false);

  const userMenuRef    = useRef<HTMLDivElement>(null);
  const desktopWrapRef = useRef<HTMLDivElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileBtnRef   = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [fromDesktop, setFromDesktop] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  /* Auth guard — redirect to login if no token */
  useEffect(() => {
    const token = localStorage.getItem('bs_access_token');
    if (!token) {
      router.replace('/login');
      return;
    }
    setUser(getUser());
    setAuthChecked(true);
  }, [router]);

  useEffect(() => { setMenuOpen(false); }, [path]);

  /* Sync wishlist count from localStorage + react to add/remove events */
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
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
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
          /* Desktop — focus the nav bar input directly */
          desktopInputRef.current?.focus();
          const rect = desktopWrapRef.current?.getBoundingClientRect();
          if (rect) { setAnchor(rect); setFromDesktop(true); setSearchOpen(true); }
        } else {
          /* Mobile — open floating dropdown with its own input */
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

  /* Focus mobile input when mobile dropdown opens */
  useEffect(() => {
    if (searchOpen && !fromDesktop) {
      setTimeout(() => searchInputRef.current?.focus(), 40);
    }
  }, [searchOpen, fromDesktop]);

  function openSearch(rect: DOMRect, isDesktop = false) {
    setAnchor(rect);
    setFromDesktop(isDesktop);
    setSearchOpen(true);
  }

  function closeSearch() { setSearchOpen(false); setSearchQuery(''); }

  function logout() { clearAuth(); setUser(null); router.replace('/login'); }

  const isDark = theme === 'dark';
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

  /* Loading / auth-redirect state */
  if (!authChecked) {
    return (
      <div className="dash-area min-h-screen bg-gray-50 dark:bg-[#020817] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
          <span className="text-sm text-gray-400 dark:text-white/35">Loading…</span>
        </div>
      </div>
    );
  }

  /* ── Inline search dropdown (portal) ─────────────────────── */
  const searchDropdown = searchOpen && mounted && anchor ? createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={closeSearch} />
      <div
        className="fixed z-50 rounded-xl overflow-hidden"
        style={{
          top:      anchor.bottom + 6,
          left:     anchor.width < 80 ? Math.max(8, anchor.right - 360) : anchor.left,
          width:    anchor.width < 80 ? Math.min(360, window.innerWidth - 16) : Math.max(anchor.width, 380),
          maxWidth: window.innerWidth - 16,
          background: 'var(--dropdown-bg)',
          border: '1px solid var(--dropdown-border)',
          boxShadow: isDark
            ? '0 16px 48px rgba(0,0,0,0.65), 0 4px 16px rgba(0,0,0,0.4), 0 0 0 1px rgba(124,58,237,0.12)'
            : '8px 16px 32px #b8c1d4, -8px 8px 24px #b8c1d4, 0 2px 0 rgba(255,255,255,0.9)',
        }}>

        {/* Input row — mobile only; desktop uses the nav bar search input directly */}
        {!fromDesktop && (
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b"
            style={{ borderColor: 'var(--dropdown-border)' }}>
            <span className="text-gray-400 dark:text-white/35 shrink-0"><SearchIcon /></span>
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search pages & features..."
              className="flex-1 bg-transparent text-sm text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-white/30 outline-none min-w-0"
            />
            <kbd className="text-gray-400 dark:text-white/50 text-[10px] border border-gray-200 dark:border-white/10 rounded px-1.5 py-0.5 font-mono shrink-0">ESC</kbd>
          </div>
        )}

        {/* Results */}
        <div className="py-1 max-h-72 overflow-y-auto scrollbar-dark">
          {searchResults.length === 0 ? (
            <div className="px-4 py-5 text-center text-sm text-gray-400 dark:text-white/50">
              No results for &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            <>
              <div className="px-3.5 pt-2 pb-1 text-[9px] font-semibold text-gray-400 dark:text-white/50 uppercase tracking-widest">
                {searchQuery ? 'Results' : 'All pages'}
              </div>
              {searchResults.map(p => {
                const active = path === p.href || path.startsWith(p.href + '/');
                return (
                  <button key={p.href}
                    onClick={() => { router.push(p.href); closeSearch(); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2 transition-colors text-left group ${
                      active ? 'bg-violet-50 dark:bg-violet-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}>
                    <span className="text-lg w-7 text-center shrink-0">{p.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium leading-snug transition-colors ${
                        active ? 'text-violet-700 dark:text-violet-300' : 'text-gray-700 dark:text-white/70 group-hover:text-gray-900 dark:group-hover:text-white'
                      }`}>
                        {p.label}
                        {p.badge && (
                          <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)', color: '#fff' }}>
                            {p.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-400 dark:text-white/40 truncate mt-0.5">{p.desc}</div>
                    </div>
                    <span className={`text-xs shrink-0 transition-colors ${
                      active ? 'text-violet-400' : 'text-gray-300 dark:text-white/20 group-hover:text-gray-500 dark:group-hover:text-white/40'
                    }`}>
                      {active ? '●' : '→'}
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>

        <div className="px-3.5 py-1.5 border-t flex items-center gap-3 text-[10px] text-gray-400 dark:text-white/50"
          style={{ borderColor: 'var(--dropdown-border)' }}>
          <span><kbd className="font-mono border border-gray-200 dark:border-white/10 rounded px-1 py-0.5 text-gray-400 dark:text-white/50">⌘K</kbd> toggle</span>
          <span><kbd className="font-mono border border-gray-200 dark:border-white/10 rounded px-1 py-0.5 text-gray-400 dark:text-white/50">↵</kbd> open</span>
          <span><kbd className="font-mono border border-gray-200 dark:border-white/10 rounded px-1 py-0.5 text-gray-400 dark:text-white/50">ESC</kbd> close</span>
        </div>
      </div>
    </>,
    document.body
  ) : null;

  return (
    <div className="dash-area min-h-screen bg-gray-50 dark:bg-[#020817] flex flex-col">

      {/* ── Top navigation bar ── */}
      <header
        className="fixed top-0 inset-x-0 z-30 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 lg:px-6 border-b backdrop-blur-xl"
        style={{
          height: 'calc(56px + env(safe-area-inset-top, 0px))',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          background: 'var(--nav-bg)',
          borderColor: 'var(--nav-border)',
        }}>

        {/* Logo */}
        <Link href="/opportunities" className="flex items-center gap-2.5 shrink-0 group" aria-label="SellBodr home">
          <img src="/icons/icon.svg" alt="SellBodr"
            className="w-9 h-9 transition-transform duration-200 group-hover:scale-110 shrink-0"
            style={{ filter: 'drop-shadow(0 0 8px rgba(124,58,237,0.75)) drop-shadow(0 0 3px rgba(219,39,119,0.4))' }} />
          <div className="hidden sm:block">
            <div className="text-[14px] font-black tracking-tight leading-none"
              style={{ background: isDark ? 'linear-gradient(135deg,#fff 20%,#c4b5fd 100%)' : 'linear-gradient(135deg,#7c3aed 20%,#6366f1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              SellBodr
            </div>
            <div className="text-[8px] font-semibold text-gray-500 dark:text-white/60 uppercase tracking-[0.18em] leading-none mt-0.5">
              eCommerce Intelligence
            </div>
          </div>
        </Link>

        {/* Page title — mobile only */}
        <span className="sm:hidden text-sm font-semibold text-gray-600 dark:text-white/65 truncate flex-1 min-w-0 pl-1">{pageName}</span>

        {/* Desktop search bar — real input; results appear in dropdown below */}
        <div className="hidden md:flex flex-1 justify-center max-w-xl">
          <div ref={desktopWrapRef} className="w-full max-w-md">
            <div className={`flex items-center gap-2.5 rounded-xl px-4 py-2 transition-all duration-200 border ${
              searchOpen && fromDesktop
                ? 'bg-white dark:bg-white/[0.07] border-violet-400/50 dark:border-violet-500/40 shadow-sm'
                : 'bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.07] border-gray-200 hover:border-gray-300 dark:border-white/8 dark:hover:border-white/16'
            }`}>
              <span className="text-gray-400 dark:text-white/30 shrink-0"><SearchIcon /></span>
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
                placeholder="Search everything..."
                className="flex-1 bg-transparent text-sm text-gray-700 dark:text-white/70 placeholder-gray-400 dark:placeholder-white/40 outline-none min-w-0"
                aria-label="Search (⌘K)"
              />
              <kbd className="text-[10px] bg-gray-200 dark:bg-white/5 rounded px-1.5 py-1 border border-gray-300 dark:border-white/8 font-mono text-gray-500 dark:text-white/50 shrink-0">⌘K</kbd>
            </div>
          </div>
        </div>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">

          {/* Mobile search */}
          <button
            ref={mobileBtnRef}
            onClick={e => openSearch((e.currentTarget as HTMLButtonElement).getBoundingClientRect())}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-gray-600 dark:text-white/65 hover:bg-gray-100 dark:hover:bg-white/8 active:bg-gray-200 dark:active:bg-white/10 transition-colors touch-manipulation"
            aria-label="Search">
            <SearchIcon />
          </button>

          {/* Theme toggle — compact icon on mobile, pill on desktop */}
          <button
            onClick={toggleTheme}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 touch-manipulation shrink-0 text-gray-600 dark:text-white/65 hover:bg-gray-100 dark:hover:bg-white/8 active:bg-gray-200 dark:active:bg-white/10"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            onClick={toggleTheme}
            className="hidden md:flex relative items-center gap-1 h-8 px-2 rounded-full border transition-all duration-200 touch-manipulation shrink-0"
            style={{
              background: isDark ? 'rgba(124,58,237,0.12)' : 'rgba(15,23,42,0.06)',
              borderColor: isDark ? 'rgba(124,58,237,0.3)' : 'rgba(15,23,42,0.12)',
            }}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
            <span className={`flex items-center justify-center w-6 h-6 rounded-full transition-all duration-200 ${isDark ? 'text-white/40 hover:text-white/70' : 'bg-white shadow-sm text-amber-500'}`}>
              <SunIcon />
            </span>
            <span className={`flex items-center justify-center w-6 h-6 rounded-full transition-all duration-200 ${isDark ? 'bg-violet-600 shadow-sm text-white' : 'text-gray-400 hover:text-gray-600'}`}>
              <MoonIcon />
            </span>
          </button>

          {/* Wishlist — hidden on mobile (available in bottom nav) */}
          <Link href="/wishlist"
            className={`hidden md:flex relative w-9 h-9 items-center justify-center rounded-xl transition-colors touch-manipulation ${
              path === '/wishlist'
                ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : 'text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-amber-500 dark:hover:text-amber-400'
            }`}
            aria-label="Wishlist">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
              <path d="M2 2.75A2.75 2.75 0 0 1 4.75 0h6.5A2.75 2.75 0 0 1 14 2.75v12.5a.75.75 0 0 1-1.175.619L8 13.075l-4.825 2.694A.75.75 0 0 1 2 15.25V2.75Z" />
            </svg>
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-black bg-amber-500 text-black leading-none shadow-[0_0_6px_rgba(245,158,11,0.7)]">
                {wishlistCount > 99 ? '99+' : wishlistCount}
              </span>
            )}
          </Link>

          {/* User Guide — hidden on mobile (available in hamburger drawer) */}
          <Link href="/guide"
            className={`hidden md:flex w-9 h-9 items-center justify-center rounded-xl transition-colors touch-manipulation ${
              path === '/guide' || path.startsWith('/guide/')
                ? 'bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400'
                : 'text-gray-500 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-violet-600 dark:hover:text-violet-300'
            }`}
            aria-label="User Guide">
            <GuideIcon />
          </Link>

          {/* User avatar menu */}
          {user && (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(v => !v)}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs transition-transform duration-150 hover:scale-105 active:scale-95 touch-manipulation"
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
                    className="absolute right-0 top-11 bg-white dark:bg-[#0E1628] border border-gray-200 dark:border-white/10 rounded-xl p-1.5 min-w-[200px] z-50"
                    style={{ boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.55)' : '0 16px 48px rgba(15,23,42,0.12), 0 4px 12px rgba(15,23,42,0.06)' }}>
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-white/8 mb-1">
                      <div className="text-xs font-semibold text-gray-800 dark:text-white/80 truncate">{user?.name ?? 'User'}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-gray-500 dark:text-white/50 capitalize">{user?.role ?? 'member'}</span>
                        {user?.role === 'admin'
                          ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-500/25">Admin</span>
                          : user?.plan === 'pro'
                            ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-500/25">Pro</span>
                            : <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-white/55 border border-gray-200 dark:border-white/10">Free</span>
                        }
                      </div>
                    </div>
                    {isAdmin() && (
                      <>
                        <Link href="/admin" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-300/70 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/8 rounded-lg transition-colors">
                          <span>🔐</span><span>Admin Panel</span>
                        </Link>
                        <Link href="/ai-keys" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm text-amber-600 dark:text-amber-300/70 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/8 rounded-lg transition-colors">
                          <span>🔑</span><span>AI Provider Keys</span>
                        </Link>
                      </>
                    )}
                    <Link href="/guide" onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-600 dark:text-white/55 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                      <span>📖</span><span>User Guide</span>
                    </Link>
                    <Link href="/settings" onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-600 dark:text-white/55 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                      <span>⚙️</span><span>Settings</span>
                    </Link>
                    <button onClick={logout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 dark:text-red-400/70 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/8 rounded-lg transition-all min-h-[40px]">
                      <span>↩</span><span>Sign out</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Mobile "More" button */}
          <button onClick={() => setMenuOpen(true)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/5 active:bg-gray-200 dark:active:bg-white/10 transition-colors touch-manipulation"
            aria-label="Navigation menu">
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
              <rect width="18" height="2" rx="1" fill="currentColor"/>
              <rect y="6" width="14" height="2" rx="1" fill="currentColor"/>
              <rect y="12" width="18" height="2" rx="1" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Inline search dropdown */}
      {searchDropdown}

      {/* ── Mobile slide-in drawer ── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 z-40 bg-black/30 dark:bg-black/60 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)} />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="md:hidden fixed inset-y-0 right-0 z-50 w-[280px] sm:w-72 bg-white dark:bg-[#0A0F1E] border-l border-gray-200 dark:border-white/5 flex flex-col shadow-2xl"
              style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>

              <div className="flex items-center justify-between px-5 h-14 border-b border-gray-100 dark:border-white/5 shrink-0">
                <span className="text-sm font-bold text-gray-500 dark:text-white/60">All pages</span>
                <button onClick={() => setMenuOpen(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/5 text-xl touch-manipulation"
                  aria-label="Close menu">
                  &times;
                </button>
              </div>

              {user && (
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.name ?? 'User'}</div>
                    <div className="text-xs text-gray-500 dark:text-white/50 capitalize">
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
                          ? 'text-violet-700 dark:text-white'
                          : 'text-gray-600 dark:text-white/45 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                      }`}
                      style={active ? {
                        background: 'linear-gradient(135deg, rgba(124,58,237,0.10) 0%, rgba(99,102,241,0.06) 100%)',
                        boxShadow: 'inset 3px 0 0 rgba(124,58,237,0.5)',
                      } : undefined}>
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

              <div className="px-3 pt-3 border-t border-gray-100 dark:border-white/5"
                style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                <button onClick={() => { logout(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-500 dark:text-white/50 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/8 transition-all min-h-[44px] touch-manipulation">
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

      <PWAInstallBanner />
      <CurrencyWidget />

      {/* ── Mobile bottom tab bar ── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 backdrop-blur-xl border-t"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          background: 'var(--nav-bg)',
          borderColor: 'var(--nav-border)',
        }}
        aria-label="Bottom navigation">
        <div className="flex items-stretch h-16">

          <Link href="/opportunities"
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-200 relative touch-manipulation ${
              isHome ? 'text-violet-600 dark:text-violet-300' : 'text-gray-500 dark:text-white/50 active:text-gray-700 dark:active:text-white/70'
            }`}>
            {isHome && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                style={{ boxShadow: '0 0 8px rgba(124,58,237,0.6)' }} />
            )}
            <span className={`text-[22px] leading-none transition-transform duration-200 ${isHome ? 'scale-110' : ''}`}>🎯</span>
            <span className={`text-[10px] font-semibold leading-none ${isHome ? 'text-violet-600 dark:text-violet-300' : ''}`}>Scout</span>
          </Link>

          <button
            onClick={e => openSearch((e.currentTarget as HTMLButtonElement).getBoundingClientRect())}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-gray-500 dark:text-white/50 active:text-gray-700 dark:active:text-white/70 transition-colors touch-manipulation"
            aria-label="Search">
            <span className="text-gray-400 dark:text-white/50">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </span>
            <span className="text-[10px] font-medium leading-none">Search</span>
          </button>

          <Link href="/wishlist"
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-200 relative touch-manipulation ${
              path === '/wishlist' ? 'text-amber-500 dark:text-amber-300' : 'text-gray-500 dark:text-white/50 active:text-gray-700 dark:active:text-white/70'
            }`}>
            {path === '/wishlist' && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400"
                style={{ boxShadow: '0 0 8px rgba(245,158,11,0.6)' }} />
            )}
            <span className={`text-[22px] leading-none transition-transform duration-200 ${path === '/wishlist' ? 'scale-110' : ''}`}>🌟</span>
            <span className={`text-[10px] font-semibold leading-none ${path === '/wishlist' ? 'text-amber-500 dark:text-amber-300' : ''}`}>Wishlist</span>
          </Link>

          <button
            onClick={() => setMenuOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-gray-500 dark:text-white/50 active:text-gray-700 dark:active:text-white/70 transition-colors touch-manipulation"
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
