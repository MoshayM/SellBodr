'use client';
import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { api, getUser, isAdmin, getGuestKey, setGuestKey } from '@/lib/api';

type Tab = 'ai-keys' | 'security' | 'marketplaces' | 'guide' | 'api-keys' | 'white-label';

// Free-tier providers — available to guest users (stored in localStorage)
const FREE_PROVIDERS = [
  { id: 'groq',    label: 'Groq',    hint: 'Llama 3, Mixtral — free tier available', docsUrl: 'https://console.groq.com/keys',        placeholder: 'gsk_...' },
  { id: 'mistral', label: 'Mistral', hint: 'Mistral models — free tier available',    docsUrl: 'https://console.mistral.ai/api-keys/', placeholder: 'sk-...'  },
];

// All providers — Pro accounts only (stored in DB)
const ALL_PROVIDERS = [
  { id: 'groq',      label: 'Groq',        hint: 'Llama 3, Mixtral (fast inference)', docsUrl: 'https://console.groq.com/keys',                placeholder: 'gsk_...'          },
  { id: 'anthropic', label: 'Anthropic',   hint: 'Claude models',                     docsUrl: 'https://console.anthropic.com/keys',           placeholder: 'sk-ant-api03-...' },
  { id: 'openai',    label: 'OpenAI',      hint: 'GPT-4o, o1 & more',                 docsUrl: 'https://platform.openai.com/api-keys',          placeholder: 'sk-proj-...'      },
  { id: 'xai',       label: 'xAI (Grok)', hint: 'Grok-2, Grok-3',                    docsUrl: 'https://console.x.ai/',                        placeholder: 'xai-...'          },
  { id: 'gemini',    label: 'Gemini',      hint: 'Gemini 1.5 & 2.0',                  docsUrl: 'https://aistudio.google.com/app/apikey',        placeholder: 'AIzaSy...'        },
  { id: 'mistral',   label: 'Mistral',     hint: 'Mistral Large, Codestral',           docsUrl: 'https://console.mistral.ai/api-keys/',          placeholder: '...'              },
  { id: 'cohere',    label: 'Cohere',      hint: 'Command R+',                         docsUrl: 'https://dashboard.cohere.com/api-keys',         placeholder: '...'              },
];

type ProviderStatus = {
  id: string; label: string; hint: string;
  isSet: boolean; masked: string | null; source: 'db' | 'env' | 'none';
};

const CURRENCIES = ['USD','GBP','EUR','CAD','AUD','INR','SGD','AED','JPY','MYR','THB','PHP'];
const COUNTRIES  = [
  { code: 'US', name: 'United States' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },        { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },      { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },          { code: 'IN', name: 'India' },
  { code: 'SG', name: 'Singapore' },      { code: 'AE', name: 'UAE' },
  { code: 'MX', name: 'Mexico' },         { code: 'BR', name: 'Brazil' },
  { code: 'IT', name: 'Italy' },          { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },    { code: 'SE', name: 'Sweden' },
  { code: 'PL', name: 'Poland' },         { code: 'TR', name: 'Turkey' },
  { code: 'SA', name: 'Saudi Arabia' },   { code: 'ZA', name: 'South Africa' },
  { code: 'MY', name: 'Malaysia' },       { code: 'TH', name: 'Thailand' },
  { code: 'PH', name: 'Philippines' },    { code: 'VN', name: 'Vietnam' },
  { code: 'ID', name: 'Indonesia' },      { code: 'OTHER', name: 'Other' },
];

function ApiKeyRow({ apiKey: k, onDelete }: { apiKey: any; onDelete: (id: string) => void }) {
  const [usage, setUsage] = useState<{ calls: number; quota: number; resetAt: string | null } | null>(null);

  useEffect(() => {
    api.settings.getApiKeyUsage(k.id)
      .then(setUsage)
      .catch(() => setUsage(null));
  }, [k.id]);

  const pct = usage && usage.quota > 0 ? Math.min(100, (usage.calls / usage.quota) * 100) : 0;
  const barColor = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#7c3aed';

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white/80">{k.name}</div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <code className="text-xs text-white/30 font-mono">{k.prefix || k.keyPreview || 'sk-...'}</code>
            {k.createdAt && (
              <span className="text-[10px] text-white/20">Created {new Date(k.createdAt).toLocaleDateString()}</span>
            )}
            {k.lastUsed && (
              <span className="text-[10px] text-white/20">Last used {new Date(k.lastUsed).toLocaleDateString()}</span>
            )}
          </div>
          {/* Usage meter */}
          {usage && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-white/30">API Usage</span>
                <span className="text-[10px] text-white/40 font-mono">{usage.calls.toLocaleString()} / {usage.quota.toLocaleString()} calls</span>
              </div>
              <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} />
              </div>
              {usage.resetAt && (
                <div className="text-[10px] text-white/20 mt-0.5">Resets {new Date(usage.resetAt).toLocaleDateString()}</div>
              )}
            </div>
          )}
        </div>
        <button onClick={() => onDelete(k.id)}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-rose-500/20 text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/8 transition-all shrink-0">
          Delete
        </button>
      </div>
    </div>
  );
}

function ApiKeysPanel({ isGuest }: { isGuest: boolean }) {
  const [keys, setKeys]       = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKey, setNewKey]   = useState<string | null>(null);
  const [copied, setCopied]   = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (isGuest) return;
    setLoading(true);
    api.settings.listApiKeys()
      .then(setKeys)
      .catch(() => setKeys([]))
      .finally(() => setLoading(false));
  }, [isGuest]);

  async function createKey() {
    if (!newName.trim()) { setError('Name is required'); return; }
    setError('');
    setCreating(true);
    try {
      const result = await api.settings.createApiKey(newName.trim());
      setNewKey(result.key || result.apiKey || result.token || JSON.stringify(result));
      setKeys(prev => [result, ...prev]);
      setNewName('');
    } catch {
      setError('Failed to create key. Try again.');
    } finally {
      setCreating(false);
    }
  }

  async function deleteKey(id: string) {
    if (!confirm('Delete this API key? This cannot be undone.')) return;
    await api.settings.deleteApiKey(id).catch(() => {});
    setKeys(prev => prev.filter(k => k.id !== id));
  }

  function copyKey(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isGuest) return (
    <div className="card-dark p-8 text-center">
      <div className="text-3xl mb-3">🗝️</div>
      <p className="text-white/40 text-sm">Sign in to manage your API keys</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-white mb-0.5">Developer API Keys</h3>
        <p className="text-xs text-white/40">Use these keys to access the SellBodr REST API programmatically. Keys are scoped to your account and plan.</p>
      </div>

      {/* New key revealed */}
      {newKey && (
        <div className="card-dark p-4 border border-emerald-500/25 bg-emerald-500/6">
          <div className="text-xs font-semibold text-emerald-300 mb-2">✅ New API key created — copy it now, it won't be shown again</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono text-emerald-200 bg-black/30 px-3 py-2 rounded-lg break-all">{newKey}</code>
            <button onClick={() => copyKey(newKey)}
              className="shrink-0 text-xs px-3 py-2 rounded-lg border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 transition-colors">
              {copied ? '✓' : 'Copy'}
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="text-xs text-white/25 mt-2 hover:text-white/50">Dismiss</button>
        </div>
      )}

      {/* Create new key form */}
      <div className="card-dark p-4 space-y-3">
        <div className="text-xs font-semibold text-white/50 uppercase tracking-widest">Create New Key</div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => { setNewName(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && createKey()}
            placeholder="Key name (e.g. My App, Production)"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-violet-500/50"
          />
          <button onClick={createKey} disabled={creating}
            className="btn-primary text-sm px-4 disabled:opacity-50 rounded-xl whitespace-nowrap">
            {creating ? '⟳' : '+ Create'}
          </button>
        </div>
        {error && <p className="text-xs text-rose-400">{error}</p>}
      </div>

      {/* Key list */}
      <div className="card-dark overflow-hidden">
        <div className="px-4 py-3 border-b border-white/8 text-xs font-semibold text-white/40 uppercase tracking-widest">
          Active Keys {keys.length > 0 && `(${keys.length})`}
        </div>
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin text-2xl text-violet-400">⟳</div>
          </div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center text-white/30 text-sm">No API keys yet. Create one above.</div>
        ) : (
          <div className="divide-y divide-white/4">
            {keys.map((k: any) => (
              <ApiKeyRow key={k.id} apiKey={k} onDelete={deleteKey} />
            ))}
          </div>
        )}
      </div>

      {/* Usage note */}
      <div className="card-dark p-4 border border-white/5">
        <div className="text-xs font-semibold text-white/35 uppercase tracking-widest mb-2">Usage</div>
        <pre className="text-xs text-white/50 font-mono bg-black/20 p-3 rounded-lg overflow-x-auto">{`curl https://sellbodr.com/api/v1/opportunities \\
  -H "Authorization: Bearer YOUR_API_KEY"`}</pre>
        <p className="text-xs text-white/30 mt-2">API access is available on Organisation plan. Free and Pro keys are rate-limited to 100 requests/day.</p>
      </div>
    </div>
  );
}

const WL_STORAGE_KEY = 'bs_whitelabel';

function WhiteLabelPanel({ user }: { user: any }) {
  const isOrg = user?.plan === 'organisation' || user?.role === 'admin';

  const [settings, setSettings] = useState(() => {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem(WL_STORAGE_KEY) || '{}'); } catch { return {}; }
  });

  const [saved, setSaved] = useState(false);

  function update(key: string, value: string) {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  }

  function save() {
    localStorage.setItem(WL_STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function reset() {
    if (!confirm('Reset all white-label settings to default?')) return;
    localStorage.removeItem(WL_STORAGE_KEY);
    setSettings({});
  }

  const previewColor  = settings.primaryColor  || '#7c3aed';
  const previewAccent = settings.accentColor    || '#4f46e5';
  const previewName   = settings.brandName      || 'SellBodr';
  const previewTagline = settings.tagline       || 'Find Products in India. Sell Globally.';

  if (!isOrg) return (
    <div className="card-dark p-8 text-center">
      <div className="text-4xl mb-4">🎨</div>
      <h3 className="text-lg font-bold text-white mb-2">White-label is an Organisation feature</h3>
      <p className="text-sm text-white/45 mb-5 max-w-sm mx-auto leading-relaxed">
        Replace the SellBodr brand with your own logo, colours, and name — perfect for agencies and resellers.
      </p>
      <div className="grid grid-cols-2 gap-3 mb-5 text-left max-w-sm mx-auto">
        {[
          { icon: '🏷️', text: 'Custom brand name & tagline' },
          { icon: '🎨', text: 'Primary & accent colour control' },
          { icon: '🖼️', text: 'Logo URL (PNG/SVG)' },
          { icon: '🌐', text: 'Custom domain support' },
        ].map(f => (
          <div key={f.text} className="flex items-start gap-2">
            <span className="text-base shrink-0">{f.icon}</span>
            <span className="text-xs text-white/50 leading-relaxed">{f.text}</span>
          </div>
        ))}
      </div>
      <a href="mailto:sellbodr@gmail.com?subject=Organisation Plan Enquiry"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm"
        style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
        Contact us for pricing →
      </a>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-white mb-0.5">White-label Settings</h3>
          <p className="text-xs text-white/40">Customise branding across your organisation's workspace. Changes apply to all team members.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={reset} className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/35 hover:text-white/70 transition-colors">Reset</button>
          <button onClick={save} className="text-xs px-4 py-1.5 rounded-lg font-semibold text-white transition-all"
            style={{ background: saved ? '#10b981' : 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
            {saved ? '✓ Saved' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Fields */}
        <div className="space-y-4">

          {/* Brand name */}
          <div>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-widest block mb-1.5">Brand Name</label>
            <input type="text" value={settings.brandName || ''} onChange={e => update('brandName', e.target.value)}
              placeholder="SellBodr"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-violet-500/50" />
          </div>

          {/* Tagline */}
          <div>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-widest block mb-1.5">Tagline</label>
            <input type="text" value={settings.tagline || ''} onChange={e => update('tagline', e.target.value)}
              placeholder="Find Products in India. Sell Globally."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-violet-500/50" />
          </div>

          {/* Logo URL */}
          <div>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-widest block mb-1.5">Logo URL <span className="text-white/20 normal-case font-normal">(PNG / SVG)</span></label>
            <input type="url" value={settings.logoUrl || ''} onChange={e => update('logoUrl', e.target.value)}
              placeholder="https://example.com/logo.svg"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-violet-500/50" />
            {settings.logoUrl && (
              <div className="mt-2 w-10 h-10 rounded-lg border border-white/10 flex items-center justify-center overflow-hidden bg-white/5">
                <img src={settings.logoUrl} alt="Logo preview" className="w-8 h-8 object-contain"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            )}
          </div>

          {/* Primary colour */}
          <div>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-widest block mb-1.5">Primary Colour</label>
            <div className="flex items-center gap-3">
              <input type="color" value={settings.primaryColor || '#7c3aed'} onChange={e => update('primaryColor', e.target.value)}
                className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
              <input type="text" value={settings.primaryColor || '#7c3aed'} onChange={e => update('primaryColor', e.target.value)}
                placeholder="#7c3aed"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none focus:border-violet-500/50" />
            </div>
          </div>

          {/* Accent colour */}
          <div>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-widest block mb-1.5">Accent Colour</label>
            <div className="flex items-center gap-3">
              <input type="color" value={settings.accentColor || '#4f46e5'} onChange={e => update('accentColor', e.target.value)}
                className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
              <input type="text" value={settings.accentColor || '#4f46e5'} onChange={e => update('accentColor', e.target.value)}
                placeholder="#4f46e5"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none focus:border-violet-500/50" />
            </div>
          </div>

          {/* Custom domain */}
          <div>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-widest block mb-1.5">Custom Domain <span className="text-white/20 normal-case font-normal">(contact support to activate)</span></label>
            <input type="text" value={settings.customDomain || ''} onChange={e => update('customDomain', e.target.value)}
              placeholder="app.yourcompany.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-violet-500/50" />
          </div>

          {/* Support email */}
          <div>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-widest block mb-1.5">Support Email <span className="text-white/20 normal-case font-normal">(shown to your team)</span></label>
            <input type="email" value={settings.supportEmail || ''} onChange={e => update('supportEmail', e.target.value)}
              placeholder="support@yourcompany.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-violet-500/50" />
          </div>
        </div>

        {/* Live preview */}
        <div>
          <div className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Live Preview</div>
          <div className="rounded-2xl overflow-hidden border border-white/8" style={{ background: '#020817' }}>
            {/* Nav bar preview */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/8" style={{ background: 'rgba(255,255,255,0.03)' }}>
              {settings.logoUrl
                ? <img src={settings.logoUrl} alt="" className="w-7 h-7 object-contain rounded"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                : <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black"
                    style={{ background: `linear-gradient(135deg, ${previewColor}, ${previewAccent})` }}>
                    {previewName.slice(0, 2).toUpperCase()}
                  </div>
              }
              <div>
                <div className="text-xs font-black text-white leading-none">{previewName}</div>
                <div className="text-[8px] text-white/30 leading-none mt-0.5">eCommerce Intelligence</div>
              </div>
            </div>
            {/* Hero preview */}
            <div className="p-5">
              <div className="text-2xl font-black text-white mb-1">Scout</div>
              <div className="text-xs text-white/40 mb-4">{previewTagline}</div>
              <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-bold"
                style={{ background: `linear-gradient(135deg, ${previewColor}, ${previewAccent})` }}>
                ＋ New Scan
              </div>
              {/* Fake card */}
              <div className="mt-4 p-3 rounded-xl border border-white/8 bg-white/3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-white/70">Brass Diya Set (5 pcs)</div>
                  <div className="text-xs font-black" style={{ color: previewColor }}>82</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="text-[10px] px-2 py-0.5 rounded-full text-white font-bold"
                    style={{ background: `linear-gradient(135deg, ${previewColor}, ${previewAccent})` }}>LAUNCH</div>
                  <div className="text-[10px] text-white/35">+$14.20/unit</div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-white/25 mt-2 text-center">Preview updates live as you type</p>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('marketplaces');
  const [user, setUser] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState(false);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    setIsGuest(!localStorage.getItem('bs_access_token'));
    const admin = isAdmin();
    setIsUserAdmin(admin);
    if (admin) setTab('ai-keys');
  }, []);

  const TABS: { key: Tab; label: string; icon: string }[] = [
    ...(isUserAdmin ? [{ key: 'ai-keys' as Tab, label: 'AI Keys', icon: '🔑' }] : []),
    { key: 'marketplaces', label: 'Marketplaces', icon: '🛒' },
    { key: 'security',     label: 'Security',     icon: '🛡️' },
    { key: 'guide',        label: 'Guide',        icon: '📖' },
    { key: 'api-keys' as Tab, label: 'API Keys', icon: '🗝️' },
    { key: 'white-label' as Tab, label: 'White-label', icon: '🎨' },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        {user?.email
          ? <p className="text-sm text-white/40 mt-0.5">{user.email}</p>
          : isGuest && <p className="text-sm text-white/40 mt-0.5">Browsing as guest</p>
        }
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-white/10 mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === t.key
                ? 'border-violet-500 text-violet-400'
                : 'border-transparent text-white/50 hover:text-white'
            }`}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {tab === 'ai-keys'      && isUserAdmin && <AiProviderKeysTab />}
      {tab === 'marketplaces' && <MarketplacesTab />}
      {tab === 'security'     && (isGuest ? <GuestSecurityTab /> : <SecurityTab />)}
      {tab === 'guide'        && <UserGuideTab />}

      {/* ── API Keys ── */}
      {tab === 'api-keys' && <ApiKeysPanel isGuest={isGuest} />}
      {tab === 'white-label' && <WhiteLabelPanel user={user} />}
    </div>
  );
}

// ── Guest AI Keys (localStorage, Groq + Mistral only) ────────────────────────

function GuestAiKeysTab() {
  const [drafts,   setDrafts]   = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [saved,    setSaved]    = useState(false);
  const [mounted,  setMounted]  = useState(false);

  useEffect(() => { setMounted(true); }, []);

  function save() {
    for (const p of FREE_PROVIDERS) {
      if (drafts[p.id] !== undefined) setGuestKey(p.id, drafts[p.id]);
    }
    setDrafts({}); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (!mounted) return null;

  return (
    <div className="space-y-4">
      {/* Free tier notice */}
      <div className="flex gap-3 p-4 rounded-xl border border-amber-500/25 bg-amber-500/8">
        <span className="text-amber-400 text-lg shrink-0">✦</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-200/90 mb-1">Free-tier providers only</p>
          <p className="text-xs text-amber-200/60 leading-relaxed mb-3">
            As a guest you can configure Groq and Mistral — both offer generous free tiers.
            Your keys are stored only in your browser (never sent to our servers permanently).
          </p>
          <div className="flex gap-2 flex-wrap">
            <Link href="/register"
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-white bg-violet-600 hover:bg-violet-500 shadow-[0_0_8px_rgba(124,58,237,0.4)] transition-all">
              Upgrade to Pro — unlock Anthropic, OpenAI, xAI &amp; more →
            </Link>
          </div>
        </div>
      </div>

      {FREE_PROVIDERS.map(p => {
        const current = getGuestKey(p.id);
        const draft   = drafts[p.id] ?? '';
        const show    = revealed[p.id] ?? false;
        const isSet   = !!current && !draft;
        return (
          <div key={p.id} className="card-dark rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${current ? 'bg-green-400' : 'bg-white/20'}`} />
                <span className="text-sm font-semibold text-white">{p.label}</span>
                <span className="text-xs text-white/40">{p.hint}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">FREE</span>
              </div>
              <a href={p.docsUrl} target="_blank" rel="noreferrer"
                className="text-xs text-white/30 hover:text-white/60 underline">
                Get key ↗
              </a>
            </div>
            {isSet && (
              <div className="text-xs font-mono text-white/40 bg-white/5 rounded px-3 py-1.5 mb-2">
                {current!.slice(0, 6)}...{current!.slice(-4)} <span className="text-green-400 ml-1">✓ saved locally</span>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type={show ? 'text' : 'password'}
                value={draft}
                onChange={e => { setDrafts(d => ({ ...d, [p.id]: e.target.value })); setSaved(false); }}
                placeholder={current ? 'Enter new key to replace…' : p.placeholder}
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 hover:border-white/20 focus:border-violet-500 rounded-lg text-sm font-mono text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/20 min-h-[40px] transition-colors"
              />
              <button type="button"
                onClick={() => setRevealed(r => ({ ...r, [p.id]: !r[p.id] }))}
                className="px-3 py-2 text-xs text-white/50 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 min-h-[40px] transition-colors">
                {show ? 'Hide' : 'Show'}
              </button>
              {current && (
                <button type="button"
                  onClick={() => { setGuestKey(p.id, ''); setDrafts(d => ({ ...d, [p.id]: '' })); }}
                  className="px-3 py-2 text-xs text-red-400 border border-red-500/30 bg-red-500/10 rounded-lg hover:bg-red-500/20 min-h-[40px] transition-colors">
                  Clear
                </button>
              )}
            </div>
          </div>
        );
      })}

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={save}
          disabled={Object.keys(drafts).length === 0}
          className="btn-primary text-sm disabled:opacity-50">
          Save Keys Locally
        </button>
        {saved && <span className="text-sm text-green-400">✓ Saved to browser</span>}
      </div>

      {/* Pro upsell card */}
      <div className="mt-2 p-5 rounded-2xl border border-violet-500/25 bg-violet-500/8">
        <div className="flex items-start gap-4">
          <div className="text-3xl shrink-0">🚀</div>
          <div>
            <p className="text-sm font-bold text-white mb-1">Unlock all AI providers with Pro</p>
            <p className="text-xs text-white/55 leading-relaxed mb-3">
              Pro accounts get Anthropic Claude (highest quality), OpenAI GPT-4o, xAI Grok, Gemini, and Cohere — all stored securely in our servers, not your browser. Plus unlimited AI searches, supplier sourcing, and AI listing generation.
            </p>
            <Link href="/register"
              className="inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl text-white bg-violet-600 hover:bg-violet-500 shadow-[0_0_12px_rgba(124,58,237,0.4)] hover:shadow-[0_0_18px_rgba(124,58,237,0.65)] transition-all border border-violet-400/30">
              Start Pro Trial — $49/mo →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Guest security placeholder ────────────────────────────────────────────────

function GuestSecurityTab() {
  return (
    <div className="p-8 rounded-2xl border border-white/8 bg-white/[0.02] text-center">
      <div className="text-4xl mb-4">🛡️</div>
      <p className="text-sm font-semibold text-white mb-2">Sign in to manage security settings</p>
      <p className="text-xs text-white/45 mb-5 max-w-xs mx-auto">
        Passkeys, password management, and account security are only available for registered Pro and Organisation accounts.
      </p>
      <Link href="/register"
        className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl text-white bg-violet-600 hover:bg-violet-500 shadow-[0_0_10px_rgba(124,58,237,0.4)] transition-all border border-violet-400/30">
        Create a Pro Account →
      </Link>
      <div className="mt-3">
        <Link href="/login" className="text-sm text-white/35 hover:text-white/60 transition-colors">
          Already have an account? Sign in
        </Link>
      </div>
    </div>
  );
}

// ── AI Provider Keys (Pro — DB backed) ───────────────────────────────────────

function AiProviderKeysTab() {
  const [statuses, setStatuses] = useState<ProviderStatus[]>([]);
  const [drafts, setDrafts]     = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    api.settings.getAiProviderKeys()
      .then((rows: any[]) => setStatuses(rows))
      .catch(() => {});
  }, []);

  function setDraft(id: string, val: string) { setDrafts(d => ({ ...d, [id]: val })); setSaved(false); }

  async function handleSave(e: FormEvent) {
    e.preventDefault(); setError('');
    const payload: Record<string, string> = {};
    for (const [id, val] of Object.entries(drafts)) payload[id] = val;
    if (Object.keys(payload).length === 0) return;
    setSaving(true);
    try {
      await api.settings.updateAiProviderKeys(payload);
      const refreshed: any[] = await api.settings.getAiProviderKeys();
      setStatuses(refreshed); setDrafts({}); setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) { setError(err.message || 'Failed to save keys.'); }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <p className="text-sm text-white/50 mb-4">
        Keys are stored securely in our database and override server environment variables.
        Leave blank to keep the current value; clear and save to remove a key.
      </p>
      {ALL_PROVIDERS.map(p => {
        const status = statuses.find(s => s.id === p.id);
        const isSet  = status?.isSet ?? false;
        const draft  = drafts[p.id] ?? '';
        const show   = revealed[p.id] ?? false;
        return (
          <div key={p.id} className="card-dark rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${isSet ? 'bg-green-400' : 'bg-white/20'}`} />
                <span className="text-sm font-semibold text-white">{p.label}</span>
                <span className="text-xs text-white/40">{p.hint}</span>
              </div>
              <div className="flex items-center gap-2">
                {status?.source === 'env' && (
                  <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded px-1.5 py-0.5">from env</span>
                )}
                {status?.source === 'db' && (
                  <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded px-1.5 py-0.5">saved</span>
                )}
                <a href={p.docsUrl} target="_blank" rel="noreferrer"
                  className="text-xs text-white/30 hover:text-white/60 underline">
                  Get key ↗
                </a>
              </div>
            </div>
            {isSet && !draft && (
              <div className="text-xs font-mono text-white/40 bg-white/5 rounded px-3 py-1.5 mb-2">
                {status!.masked}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type={show ? 'text' : 'password'}
                value={draft}
                onChange={e => setDraft(p.id, e.target.value)}
                placeholder={isSet ? 'Enter new key to replace…' : p.placeholder}
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 hover:border-white/20 focus:border-violet-500 rounded-lg text-sm font-mono text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/20 min-h-[40px] transition-colors"
              />
              <button type="button"
                onClick={() => setRevealed(r => ({ ...r, [p.id]: !r[p.id] }))}
                className="px-3 py-2 text-xs text-white/50 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 min-h-[40px] transition-colors">
                {show ? 'Hide' : 'Show'}
              </button>
              {isSet && (
                <button type="button" onClick={() => setDraft(p.id, '')} title="Clear this key"
                  className="px-3 py-2 text-xs text-red-400 border border-red-500/30 bg-red-500/10 rounded-lg hover:bg-red-500/20 min-h-[40px] transition-colors">
                  Clear
                </button>
              )}
            </div>
          </div>
        );
      })}
      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">{error}</div>
      )}
      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={saving || Object.keys(drafts).length === 0}
          className="btn-primary text-sm disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Keys'}
        </button>
        {saved && <span className="text-sm text-green-400">✓ Saved successfully</span>}
      </div>
    </form>
  );
}

// ── Marketplaces ──────────────────────────────────────────────────────────────

const BLANK = { code: '', country: 'US', currency: 'USD', referralPct: 15, fbaFeeMinor: 350, storageFee: 50 };

function MarketplacesTab() {
  const [markets, setMarkets]   = useState<any[]>([]);
  const [form, setForm]         = useState({ ...BLANK });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [deleteId, setDeleteId] = useState('');

  function load() {
    api.marketplaces.list().then((rows: any[]) => setMarkets(rows)).catch(() => {});
  }
  useEffect(() => { load(); }, []);

  function fee(mp: any) {
    try { return JSON.parse(mp.feeSchedule); } catch { return {}; }
  }

  async function toggleActive(mp: any) {
    await api.marketplaces.update(mp.id, { active: !mp.active }).catch(() => {});
    load();
  }

  async function handleDelete(id: string) {
    setDeleteId(id);
    try { await api.marketplaces.remove(id); load(); }
    catch (err: any) { setError(err.message || 'Cannot delete'); }
    setDeleteId('');
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      await api.marketplaces.create({
        code:        form.code.trim(),
        country:     form.country,
        currency:    form.currency,
        referralPct: Number(form.referralPct),
        fbaFeeMinor: Number(form.fbaFeeMinor),
        storageFee:  Number(form.storageFee),
      });
      setForm({ ...BLANK }); setShowForm(false); load();
    } catch (err: any) { setError(err.message || 'Failed to create'); }
    setSaving(false);
  }

  function set(field: keyof typeof BLANK) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));
  }

  const inputCls = 'w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-violet-500 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/20 min-h-[40px] transition-colors';
  const selectCls = inputCls + ' [&>option]:bg-[#0a0f1e] [&>option]:text-white';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/50">
          Manage the marketplaces available for opportunity searches. Toggle active/inactive or add a custom marketplace.
        </p>
        <button onClick={() => { setShowForm(s => !s); setError(''); }}
          className="btn-primary text-sm shrink-0 ml-4">
          {showForm ? '✕ Cancel' : '+ Add'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleCreate} className="card-dark rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-white text-sm">New Marketplace</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">
                Marketplace Code <span className="text-white/30">(e.g. amazon_us)</span>
              </label>
              <input required value={form.code} onChange={set('code')} placeholder="e.g. temu_us"
                pattern="[a-z0-9_]+" title="Lowercase letters, numbers and underscores only"
                className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">Country</label>
              <select value={form.country} onChange={set('country')} className={selectCls}>
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">Currency</label>
              <select value={form.currency} onChange={set('currency')} className={selectCls}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">Referral Fee %</label>
              <input type="number" required min={0} max={50} step={0.1}
                value={form.referralPct} onChange={set('referralPct')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">FBA / Fulfilment Fee (minor units)</label>
              <input type="number" required min={0} value={form.fbaFeeMinor} onChange={set('fbaFeeMinor')} className={inputCls} />
              <p className="text-xs text-white/30 mt-0.5">In paise/cents (e.g. 350 = ₹3.50 / $3.50)</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">Storage Fee (minor units / month)</label>
              <input type="number" required min={0} value={form.storageFee} onChange={set('storageFee')} className={inputCls} />
            </div>
          </div>
          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</div>
          )}
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-50">
              {saving ? 'Creating…' : 'Create Marketplace'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setError(''); }} className="btn-secondary text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {!showForm && error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">{error}</div>
      )}

      <div className="space-y-2">
        {markets.length === 0 && (
          <div className="text-center py-10 text-white/30">
            <div className="text-3xl mb-2">🛒</div>
            <p className="text-sm">No marketplaces yet — loading…</p>
          </div>
        )}
        {markets.map(mp => {
          const f = fee(mp);
          return (
            <div key={mp.id}
              className={`flex items-center gap-3 sm:gap-4 border rounded-xl px-4 py-3 transition-colors ${
                mp.active ? 'border-white/10 bg-white/5' : 'border-white/5 bg-white/[0.02] opacity-50'
              }`}>
              {/* Active toggle */}
              <button onClick={() => toggleActive(mp)} title={mp.active ? 'Disable' : 'Enable'}
                className={`relative shrink-0 w-10 h-5 rounded-full transition-colors ${mp.active ? 'bg-violet-600' : 'bg-white/20'}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${mp.active ? 'translate-x-5' : ''}`} />
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-semibold text-white">{mp.code}</span>
                  <span className="text-xs bg-white/10 text-white/60 px-1.5 py-0.5 rounded">{mp.country}</span>
                  <span className="text-xs bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded">{mp.currency}</span>
                  {!mp.active && <span className="text-xs bg-white/10 text-white/30 px-1.5 py-0.5 rounded">inactive</span>}
                </div>
                <div className="flex gap-3 mt-0.5 text-xs text-white/30">
                  <span>Referral: {f.referralPct ?? '—'}%</span>
                  <span>FBA: {f.fbaFeeMinor ?? '—'}</span>
                  <span>Storage: {f.storageFee ?? '—'}</span>
                </div>
              </div>

              {/* Delete */}
              <button onClick={() => handleDelete(mp.id)}
                disabled={deleteId === mp.id}
                title="Delete marketplace"
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40">
                {deleteId === mp.id ? '…' : '🗑'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── User Guide ────────────────────────────────────────────────────────────────

const GUIDE_STEPS = [
  {
    step: '01',
    title: 'Run your first AI search',
    icon: '🎯',
    body: 'Go to Opportunities → click "+ New Search". The AI scouts 10,000+ India-sourced products, scores each across 7 dimensions, and surfaces the top 8 opportunities for your selected marketplace. Each search takes ~10–30 seconds.',
  },
  {
    step: '02',
    title: 'Read the Opportunity Score',
    icon: '📊',
    body: 'Each opportunity gets a 0–100 composite score and a Launch / Hold / Reject decision. The score is a weighted blend of: Demand (22%), Margin (20%), Competition (16%), Trend (14%), Marketplace Fit (12%), Shipping (10%), and Saturation (6%). A score ≥70 with margin ≥35 earns a Launch badge.',
  },
  {
    step: '03',
    title: 'Drill into an opportunity',
    icon: '🔍',
    body: 'Click "View" on any row to open the full opportunity detail. You\'ll see: the profit model (source cost → landed cost → marketplace fees → net profit), all 7 dimension scores with explanations, and sourcing candidates from Indian suppliers with MOQ and lead-time estimates.',
  },
  {
    step: '04',
    title: 'Filter and compare',
    icon: '🔬',
    body: 'Use the marketplace dropdown to compare the same product across Amazon US, eBay UK, Etsy, and 70+ other markets. Use the Launch / Hold / Reject pill filters to focus on your strongest candidates. Sort by score, net profit, or trend direction.',
  },
  {
    step: '05',
    title: 'Build your AI listing',
    icon: '📝',
    body: 'Head to AI Listing (Tools section in the sidebar). Select an opportunity and the AI generates an SEO-optimised title, 5 bullet points, product description, and backend keywords — ready to paste into Seller Central or your preferred tool.',
  },
  {
    step: '06',
    title: 'Track profitability',
    icon: '💰',
    body: 'The Profitability page lets you enter your real landed cost, ads spend, and storage fees to compute your actual net margin and ROI. Adjust the sliders to model different pricing strategies before committing to a listing.',
  },
  {
    step: '07',
    title: 'Connect your own AI keys (optional)',
    icon: '🔑',
    body: 'In Settings → AI Provider Keys you can connect your own Groq, Anthropic, or OpenAI API key. Your personal key overrides the shared server key and gives you higher rate limits. Keys are encrypted at rest and never exposed in the UI.',
  },
  {
    step: '08',
    title: 'Install the app',
    icon: '📱',
    body: 'SellBodr is a Progressive Web App. On Chrome / Edge: click "Install" in the address bar or wait for the install banner. On iOS Safari: tap Share → Add to Home Screen. On Android Chrome: tap the three-dot menu → Add to Home Screen. The installed app works offline for previously loaded pages.',
  },
];

function UserGuideTab() {
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <p className="text-sm text-white/50">
          A step-by-step walkthrough of every major feature in SellBodr.
        </p>
      </div>
      {GUIDE_STEPS.map(s => (
        <div key={s.step} className="card-dark rounded-xl p-5 flex gap-4">
          <div className="shrink-0 flex flex-col items-center gap-1.5">
            <div className="text-2xl">{s.icon}</div>
            <div className="text-[10px] font-bold text-violet-400 font-mono">{s.step}</div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white mb-1.5">{s.title}</h3>
            <p className="text-xs text-white/55 leading-relaxed">{s.body}</p>
          </div>
        </div>
      ))}

      <div className="card-dark rounded-xl p-5 mt-2">
        <h3 className="text-sm font-bold text-white mb-2">Need more help?</h3>
        <p className="text-xs text-white/55 leading-relaxed mb-3">
          Browse our documentation or reach out to the team directly. We typically respond within one business day.
        </p>
        <div className="flex gap-3 flex-wrap">
          <a href="mailto:support@sellbodr.com"
            className="btn-secondary text-xs py-2 min-h-0">
            Email support
          </a>
          <a href="/privacy"
            className="text-xs text-white/30 hover:text-white/50 transition-colors self-center">
            Privacy Policy
          </a>
          <a href="/terms"
            className="text-xs text-white/30 hover:text-white/50 transition-colors self-center">
            Terms of Service
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Security (Passkeys + Password) ────────────────────────────────────────────

function SecurityTab() {
  return (
    <div className="space-y-8">
      <PasskeysSection />
      <div className="border-t border-white/10 pt-8">
        <h3 className="text-sm font-semibold text-white mb-1">Password</h3>
        <p className="text-xs text-white/40 mb-4">Change your account password. Passkey users can set a password as a backup.</p>
        <PasswordForm />
      </div>
    </div>
  );
}

function PasskeysSection() {
  const [passkeys, setPasskeys]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [adding, setAdding]       = useState(false);
  const [error, setError]         = useState('');
  const [renameId, setRenameId]   = useState('');
  const [renameName, setRenameName] = useState('');
  const [deleteId, setDeleteId]   = useState('');

  function loadPasskeys() {
    setLoading(true);
    api.passkeys.list()
      .then(rows => setPasskeys(rows))
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(() => { loadPasskeys(); }, []);

  async function handleAdd() {
    setError(''); setAdding(true);
    try {
      const beginData = await api.passkeys.registerBegin();
      const { challengeId, ...options } = beginData;
      const { startRegistration } = await import('@simplewebauthn/browser');
      const attResp = await startRegistration(options);
      const deviceName = `Passkey ${new Date().toLocaleDateString()}`;
      await api.passkeys.registerComplete(challengeId, deviceName, attResp);
      loadPasskeys();
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        setError('Passkey setup was cancelled.');
      } else {
        setError(err?.message || 'Failed to add passkey.');
      }
    } finally { setAdding(false); }
  }

  async function handleDelete(id: string) {
    setDeleteId(id); setError('');
    try {
      await api.passkeys.delete(id);
      setPasskeys(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete passkey.');
    } finally { setDeleteId(''); }
  }

  async function handleRename(id: string) {
    if (!renameName.trim()) return;
    try {
      await api.passkeys.rename(id, renameName.trim());
      setPasskeys(prev => prev.map(p => p.id === id ? { ...p, name: renameName.trim() } : p));
      setRenameId('');
    } catch (err: any) {
      setError(err?.message || 'Failed to rename passkey.');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Passkeys</h3>
          <p className="text-xs text-white/40 mt-0.5">
            Laptop: Windows Hello PIN or fingerprint · Mac: Touch ID · Mobile: Face ID or fingerprint.
            No USB security key required.
          </p>
        </div>
        <button onClick={handleAdd} disabled={adding}
          className="btn-primary text-sm py-2 min-h-0 disabled:opacity-60 flex items-center gap-2">
          {adding ? (
            <>
              <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full block" />
              Adding…
            </>
          ) : '+ Add Passkey'}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 mb-3">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-8 text-white/30 text-sm">Loading passkeys…</div>
      ) : passkeys.length === 0 ? (
        <div className="card-dark rounded-xl p-6 text-center">
          <div className="text-3xl mb-2">🔑</div>
          <p className="text-sm text-white/50 mb-1">No passkeys registered</p>
          <p className="text-xs text-white/30">Add a passkey to sign in with your fingerprint, Face ID, or device PIN.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {passkeys.map(pk => (
            <div key={pk.id} className="card-dark rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="text-xl shrink-0">
                {pk.deviceType === 'multiDevice' ? '☁️' : '📱'}
              </div>
              <div className="flex-1 min-w-0">
                {renameId === pk.id ? (
                  <div className="flex gap-2">
                    <input
                      autoFocus value={renameName}
                      onChange={e => setRenameName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRename(pk.id); if (e.key === 'Escape') setRenameId(''); }}
                      className="flex-1 px-2 py-1 bg-white/5 border border-violet-500 rounded text-sm text-white focus:outline-none"
                    />
                    <button onClick={() => handleRename(pk.id)} className="text-xs text-violet-400 hover:text-violet-300">Save</button>
                    <button onClick={() => setRenameId('')} className="text-xs text-white/40 hover:text-white/60">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">{String(pk.name)}</span>
                    {pk.backedUp && <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded">synced</span>}
                  </div>
                )}
                <div className="text-xs text-white/30 mt-0.5">
                  Added {pk.createdAt ? new Date(Number(pk.createdAt)).toLocaleDateString() : '—'}
                  {pk.lastUsedAt ? ` · Last used ${new Date(Number(pk.lastUsedAt)).toLocaleDateString()}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => { setRenameId(pk.id); setRenameName(String(pk.name)); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors text-sm"
                  title="Rename">✏️</button>
                <button
                  onClick={() => handleDelete(pk.id)}
                  disabled={deleteId === pk.id}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                  title="Remove passkey">
                  {deleteId === pk.id ? '…' : '🗑'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PasswordForm() {
  const [form, setForm]     = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError]   = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError('');
    if (form.newPassword.length < 8) { setError('New password must be at least 8 characters.'); return; }
    if (form.newPassword !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    setStatus('loading');
    try {
      await api.settings.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      setStatus('success');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) { setError(err.message || 'Failed to change password.'); setStatus('error'); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((field, i) => (
        <div key={field}>
          <label className="block text-sm font-medium text-white/70 mb-1.5">
            {['Current Password', 'New Password', 'Confirm New Password'][i]}
          </label>
          <input type="password" required autoComplete={i === 0 ? 'current-password' : 'new-password'}
            value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 hover:border-white/20 focus:border-violet-500 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/20 min-h-[44px] transition-colors" />
          {field === 'newPassword' && <p className="text-xs text-white/30 mt-1">Minimum 8 characters</p>}
        </div>
      ))}
      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">{error}</div>
      )}
      {status === 'success' && (
        <div className="text-sm text-green-400 bg-green-500/10 border border-green-500/30 rounded-xl px-3 py-2">
          ✓ Password changed. All other sessions have been signed out.
        </div>
      )}
      <button type="submit" disabled={status === 'loading'} className="btn-primary text-sm disabled:opacity-50">
        {status === 'loading' ? 'Saving…' : 'Change Password'}
      </button>
    </form>
  );
}
