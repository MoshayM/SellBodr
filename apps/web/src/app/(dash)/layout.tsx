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

function SIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
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
  const [guestBannerDismissed, setGuestBannerDismissed] = useState(false);

  const userMenuRef   = useRef<HTMLDivElement>(null);
  const desktopBtnRef = useRef<HTMLButtonElement>(null);
  const mobileBtnRef  = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const token = localStorage.getItem('bs_access_token');
    if (token) {
      setUser(getUser());
    }
    setAuthChecked(true);
  }, []);

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

  /* ⌘K global shortcut — anchors to desktop bar */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const ref = desktopBtnRef.current ?? mobileBtnRef.current;
        if (ref) openSearch(ref.getBoundingClientRect());
      }
      if (e.key === 'Escape') setSearchOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* Focus input when dropdown opens */
  useEffect(() => {
    if (searchOpen) {
      setSearchQuery('');
      setTimeout(() => searchInputRef.current?.focus(), 40);
    }
  }, [searchOpen]);

  function openSearch(rect: DOMRect) {
    setAnchor(rect);
    setSearchOpen(true);
  }

  function closeSearch() { setSearchOpen(false); }

  function logout() { clearAuth(); setUser(null); router.push('/opportunities'); }

  const isGuest = authChecked && !user;
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

  /* ── Inline search dropdown (portal) ─────────────────── */
  const searchDropdown = searchOpen && mounted && anchor ? createPortal(
    <>
      {/* Click-away backdrop — no visual overlay */}
      <div className="fixed inset-0 z-40" onClick={closeSearch} />

      {/* Dropdown panel anchored below the trigger */}
      <div
        className="fixed z-50 bg-[#0E1628] border border-white/12 rounded-xl overflow-hidden"
        style={{
          top:      anchor.bottom + 6,
          left:     anchor.width < 80 ? Math.max(8, anchor.right - 360) : anchor.left,
          width:    anchor.width < 80 ? Math.min(360, window.innerWidth - 16) : Math.max(anchor.width, 380),
          maxWidth: window.innerWidth - 16,
          boxShadow: '0 16px 48px rgba(0,0,0,0.65), 0 4px 16px rgba(0,0,0,0.4), 0 0 0 1px rgba(124,58,237,0.12)',
        }}>

        {/* Input row */}
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-white/8">
          <span className="text-white/35 shrink-0"><SIcon /></span>
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search pages & features..."
            className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none min-w-0"
          />
          <kbd className="text-white/20 text-[10px] border border-white/10 rounded px-1.5 py-0.5 font-mono shrink-0">ESC</kbd>
        </div>

        {/* Results */}
        <div className="py-1 max-h-72 overflow-y-auto scrollbar-dark">
          {searchResults.length === 0 ? (
            <div className="px-4 py-5 text-center text-sm text-white/30">
              No results for &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            <>
              <div className="px-3.5 pt-2 pb-1 text-[9px] font-semibold text-white/20 uppercase tracking-widest">
                {searchQuery ? 'Results' : 'All pages'}
              </div>
              {searchResults.map(p => {
                const active = path === p.href || path.startsWith(p.href + '/');
                return (
                  <button key={p.href}
                    onClick={() => { router.push(p.href); closeSearch(); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2 transition-colors text-left group ${
                      active ? 'bg-violet-500/10' : 'hover:bg-white/5'
                    }`}>
                    <span className="text-lg w-7 text-center shrink-0">{p.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium leading-snug transition-colors ${active ? 'text-violet-300' : 'text-white/70 group-hover:text-white'}`}>
                        {p.label}
                        {p.badge && (
                          <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)', color: '#fff' }}>
                            {p.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-white/40 truncate mt-0.5">{p.desc}</div>
                    </div>
                    <span className={`text-xs shrink-0 transition-colors ${active ? 'text-violet-400/50' : 'text-white/20 group-hover:text-white/40'}`}>
                      {active ? '●' : '→'}
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>

        <div className="px-3.5 py-1.5 border-t border-white/10 flex items-center gap-3 text-[10px] text-white/30">
          <span><kbd className="font-mono border border-white/10 rounded px-1 py-0.5 text-white/25">⌘K</kbd> toggle</span>
          <span><kbd className="font-mono border border-white/10 rounded px-1 py-0.5 text-white/25">↵</kbd> open</span>
          <span><kbd className="font-mono border border-white/10 rounded px-1 py-0.5 text-white/25">ESC</kbd> close</span>
        </div>
      </div>
    </>,
    document.body
  ) : null;

  return (
    <div className="min-h-screen bg-[#020817] flex flex-col">

      {/* ────────────────────────────────────────────────────────────
          Top navigation bar
      ──────────────────────────────────────────────────────────── */}
      <header
        className="fixed top-0 inset-x-0 z-30 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 lg:px-6 glass border-b border-white/5"
        style={{ height: 'calc(56px + env(safe-area-inset-top, 0px))', paddingTop: 'env(safe-area-inset-top, 0px)' }}>

        {/* Logo */}
        <Link href="/opportunities" className="flex items-center gap-2.5 shrink-0 group" aria-label="SellBodr home">
          <img src="/icons/icon.svg" alt="SellBodr"
            className="w-9 h-9 transition-transform duration-200 group-hover:scale-110 shrink-0"
            style={{ filter: 'drop-shadow(0 0 8px rgba(124,58,237,0.75)) drop-shadow(0 0 3px rgba(219,39,119,0.4))' }} />
          <div className="hidden sm:block">
            <div className="text-[14px] font-black tracking-tight leading-none"
              style={{ background: 'linear-gradient(135deg,#fff 20%,#c4b5fd 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              SellBodr
            </div>
            <div className="text-[8px] font-semibold text-white/28 uppercase tracking-[0.18em] leading-none mt-0.5">
              eCommerce Intelligence
            </div>
          </div>
        </Link>

        {/* Page title — mobile only */}
        <span className="sm:hidden text-sm font-semibold text-white/65 truncate flex-1 min-w-0 pl-1">{pageName}</span>

        {/* Desktop search bar — clicks open inline dropdown */}
        <div className="hidden md:flex flex-1 justify-center max-w-xl">
          <button
            ref={desktopBtnRef}
            onClick={e => openSearch((e.currentTarget as HTMLButtonElement).getBoundingClientRect())}
            className="flex items-center gap-2.5 bg-white/[0.04] hover:bg-white/[0.07] border border-white/8 hover:border-white/16 rounded-xl px-4 py-2 text-xs text-white/35 transition-all duration-200 w-full max-w-md group"
            aria-label="Search (⌘K)">
            <span className="text-white/30 group-hover:text-white/50 transition-colors shrink-0"><SIcon /></span>
            <span className="flex-1 text-left">Search everything...</span>
            <kbd className="text-[10px] glass rounded px-1.5 py-1 border border-white/8 font-mono text-white/22">⌘K</kbd>
          </button>
        </div>

        {/* Right actions — always ml-auto to pin at far right */}
        <div className="ml-auto flex items-center gap-1 sm:gap-2">

          {/* Mobile search icon — opens dropdown anchored to this button */}
          <button
            ref={mobileBtnRef}
            onClick={e => openSearch((e.currentTarget as HTMLButtonElement).getBoundingClientRect())}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-white/40 hover:bg-white/5 active:bg-white/10 transition-colors touch-manipulation"
            aria-label="Search">
            <SIcon />
          </button>

          {/* Wishlist icon with count badge */}
          <Link href="/wishlist"
            className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-colors touch-manipulation ${
              path === '/wishlist' ? 'bg-amber-500/15 text-amber-400' : 'text-white/35 hover:bg-white/5 hover:text-amber-400'
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

          {/* User avatar (auth) OR Sign in link (guest) */}
          {user ? (
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
                    className="absolute right-0 top-11 bg-[#0E1628] border border-white/10 rounded-xl p-1.5 min-w-[192px] z-50"
                    style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.55)' }}>
                    <div className="px-3 py-2 border-b border-white/8 mb-1">
                      <div className="text-xs font-semibold text-white/80 truncate">{user?.name ?? 'User'}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-white/30 capitalize">{user?.role ?? 'member'}</span>
                        {user?.role === 'admin'
                          ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/25">Admin</span>
                          : user?.plan === 'pro'
                            ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/25">Pro</span>
                            : <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/8 text-white/35 border border-white/10">Free</span>
                        }
                      </div>
                    </div>
                    {isAdmin() && (
                      <>
                        <Link href="/admin" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-300/70 hover:text-red-300 hover:bg-red-500/8 rounded-lg transition-colors">
                          <span>🔐</span><span>Admin Panel</span>
                        </Link>
                        <Link href="/ai-keys" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm text-amber-300/70 hover:text-amber-300 hover:bg-amber-500/8 rounded-lg transition-colors">
                          <span>🔑</span><span>AI Provider Keys</span>
                        </Link>
                      </>
                    )}
                    <Link href="/settings" onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-white/55 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                      <span>⚙️</span><span>Settings</span>
                    </Link>
                    <button onClick={logout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/8 rounded-lg transition-all min-h-[40px]">
                      <span>↩</span><span>Sign out</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : authChecked ? (
            <Link href="/login"
              className="text-sm font-medium text-white/60 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/5">
              Sign in
            </Link>
          ) : null}

          {/* Mobile "More" button */}
          <button onClick={() => setMenuOpen(true)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-white/40 hover:bg-white/5 active:bg-white/10 transition-colors touch-manipulation"
            aria-label="Navigation menu">
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
              <rect width="18" height="2" rx="1" fill="currentColor"/>
              <rect y="6" width="14" height="2" rx="1" fill="currentColor"/>
              <rect y="12" width="18" height="2" rx="1" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Inline search dropdown — portal, anchored to trigger */}
      {searchDropdown}

      {/* ────────────────────────────────────────────────────────────
          Mobile slide-in drawer
      ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)} />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="md:hidden fixed inset-y-0 right-0 z-50 w-[280px] sm:w-72 bg-[#0A0F1E] border-l border-white/5 flex flex-col shadow-2xl"
              style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>

              <div className="flex items-center justify-between px-5 h-14 border-b border-white/5 shrink-0">
                <span className="text-sm font-bold text-white/60">All pages</span>
                <button onClick={() => setMenuOpen(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-white/40 hover:bg-white/5 text-xl touch-manipulation"
                  aria-label="Close menu">
                  &times;
                </button>
              </div>

              {user ? (
                <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{user.name ?? 'User'}</div>
                    <div className="text-xs text-white/30 capitalize">
                      {user.plan === 'pro' ? 'Pro' : user.role === 'admin' ? 'Admin' : 'Free'} account
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-5 py-4 border-b border-white/5">
                  <Link href="/login" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 text-sm font-medium text-violet-300 hover:text-violet-200 transition-colors">
                    Sign in to your account →
                  </Link>
                </div>
              )}

              <nav className="flex-1 px-3 py-3 overflow-y-auto scrollbar-dark space-y-0.5" aria-label="Navigation">
                {navPages.map(p => {
                  const active = path === p.href || path.startsWith(p.href + '/');
                  return (
                    <Link key={p.href} href={p.href} onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        active ? 'text-white' : 'text-white/45 hover:text-white hover:bg-white/5'
                      }`}
                      style={active ? {
                        background: 'linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(99,102,241,0.10) 100%)',
                        boxShadow: 'inset 3px 0 0 rgba(124,58,237,0.6)',
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

              <div className="px-3 pt-3 border-t border-white/5"
                style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                {user ? (
                  <button onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/30 hover:text-red-400 hover:bg-red-500/8 transition-all min-h-[44px] touch-manipulation">
                    <span>↩</span><span>Sign out</span>
                  </button>
                ) : (
                  <Link href="/register" onClick={() => setMenuOpen(false)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-violet-300 hover:text-violet-200 hover:bg-violet-500/8 transition-all min-h-[44px] touch-manipulation">
                    Create Free Account →
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Guest banner (only on /opportunities for unauthenticated visitors) ── */}
      {isGuest && path === '/opportunities' && !guestBannerDismissed && (
        <div
          className="fixed inset-x-0 z-20 flex items-center justify-between gap-3 px-4 py-2.5 bg-violet-950/90 backdrop-blur-sm border-b border-violet-500/25 text-sm"
          style={{ top: 'calc(56px + env(safe-area-inset-top, 0px))' }}>
          <span className="text-white/70">
            You&apos;re browsing as a guest.{' '}
            <Link href="/register" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">
              Create free account
            </Link>{' '}
            to run AI scans.
          </span>
          <button
            onClick={() => setGuestBannerDismissed(true)}
            aria-label="Dismiss"
            className="shrink-0 text-white/40 hover:text-white transition-colors text-lg leading-none w-6 h-6 flex items-center justify-center">
            ×
          </button>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
          Main content
      ──────────────────────────────────────────────────────────── */}
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

      {/* ────────────────────────────────────────────────────────────
          Mobile bottom tab bar
      ──────────────────────────────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 glass border-t border-white/5"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Bottom navigation">
        <div className="flex items-stretch h-16">

          <Link href="/opportunities"
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-200 relative touch-manipulation ${
              isHome ? 'text-violet-300' : 'text-white/30 active:text-white/60'
            }`}>
            {isHome && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                style={{ boxShadow: '0 0 8px rgba(124,58,237,0.6)' }} />
            )}
            <span className={`text-[22px] leading-none transition-transform duration-200 ${isHome ? 'scale-110' : ''}`}>🎯</span>
            <span className={`text-[10px] font-semibold leading-none ${isHome ? 'text-violet-300' : ''}`}>Scout</span>
          </Link>

          <button
            onClick={e => openSearch((e.currentTarget as HTMLButtonElement).getBoundingClientRect())}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-white/30 active:text-white/60 transition-colors touch-manipulation"
            aria-label="Search">
            <span className="text-white/35">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </span>
            <span className="text-[10px] font-medium leading-none">Search</span>
          </button>

          <Link href="/wishlist"
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-200 relative touch-manipulation ${
              path === '/wishlist' ? 'text-amber-300' : 'text-white/30 active:text-white/60'
            }`}>
            {path === '/wishlist' && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400"
                style={{ boxShadow: '0 0 8px rgba(245,158,11,0.6)' }} />
            )}
            <span className={`text-[22px] leading-none transition-transform duration-200 ${path === '/wishlist' ? 'scale-110' : ''}`}>🌟</span>
            <span className={`text-[10px] font-semibold leading-none ${path === '/wishlist' ? 'text-amber-300' : ''}`}>Wishlist</span>
          </Link>

          <button
            onClick={() => setMenuOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-white/30 active:text-white/60 transition-colors touch-manipulation"
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
