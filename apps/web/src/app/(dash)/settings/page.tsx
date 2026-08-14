'use client';
import { useState, useEffect, FormEvent } from 'react';
import { api, getUser } from '@/lib/api';

type Tab = 'ai-keys' | 'password' | 'marketplaces' | 'guide';

const PROVIDERS = [
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

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('ai-keys');
  const [user, setUser] = useState<any>(null);
  useEffect(() => { setUser(getUser()); }, []);

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'ai-keys',      label: 'AI Provider Keys', icon: '🔑' },
    { key: 'marketplaces', label: 'Marketplaces',      icon: '🛒' },
    { key: 'password',     label: 'Password',          icon: '🔒' },
    { key: 'guide',        label: 'User Guide',        icon: '📖' },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        {user?.email && <p className="text-sm text-white/40 mt-0.5">{user.email}</p>}
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

      {tab === 'ai-keys'      && <AiProviderKeysTab />}
      {tab === 'marketplaces' && <MarketplacesTab />}
      {tab === 'password'     && <PasswordTab />}
      {tab === 'guide'        && <UserGuideTab />}
    </div>
  );
}

// ── AI Provider Keys ─────────────────────────────────────────────────────────

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
        Keys are stored securely and override the server environment variables.
        Leave blank to keep the current value; clear and save to remove a key.
      </p>
      {PROVIDERS.map(p => {
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

// ── Password ──────────────────────────────────────────────────────────────────

function PasswordTab() {
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
