'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, isAdmin } from '@/lib/api';

type UserRow = {
  id: string; email: string; name: string; role: string; plan: string;
  mfaEnabled: boolean; lastLoginAt: number | null; createdAt: number; searchCount: number;
};

type ProviderStatus = { id: string; label: string; hint: string; isSet: boolean; masked: string | null; source: string };

function PlanBadge({ plan }: { plan: string }) {
  return plan === 'pro'
    ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">Pro</span>
    : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/8 text-white/40 border border-white/10">Free</span>;
}

function RoleBadge({ role }: { role: string }) {
  if (role === 'admin') return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">Admin</span>;
  if (role === 'owner') return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25">Owner</span>;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/8 text-white/40 border border-white/10">Member</span>;
}

export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [providerDraft, setProviderDraft] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'users' | 'providers'>('users');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin()) { router.replace('/opportunities'); return; }
    setReady(true);
    loadUsers();
    loadProviders();
  }, [router]);

  async function loadUsers() {
    try {
      const data = await api.admin.getUsers();
      setUsers(data as UserRow[]);
    } catch { /* handled gracefully */ }
  }

  async function loadProviders() {
    try {
      const data = await api.settings.getAiProviderKeys();
      setProviders(data as ProviderStatus[]);
    } catch { /* handled gracefully */ }
  }

  async function updateUser(userId: string, changes: { plan?: string; role?: string }) {
    setUpdating(userId);
    try {
      await api.admin.updateUser(userId, changes);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...changes } : u));
      showToast('Updated successfully');
    } catch { showToast('Update failed'); }
    setUpdating(null);
  }

  async function saveProviders() {
    setSaving(true);
    try {
      await api.settings.updateAiProviderKeys(providerDraft);
      setProviderDraft({});
      await loadProviders();
      showToast('Provider keys saved');
    } catch { showToast('Save failed'); }
    setSaving(false);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  if (!ready) return null;

  const totalUsers   = users.length;
  const proUsers     = users.filter(u => u.plan === 'pro').length;
  const adminUsers   = users.filter(u => u.role === 'admin').length;
  const totalSearches = users.reduce((s, u) => s + u.searchCount, 0);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-lg">🔐</div>
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-xs text-white/35 mt-0.5">User management · Provider keys · System access</p>
        </div>
        <div className="ml-auto">
          <span className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/25 uppercase tracking-wider">
            Admin Only
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Users',    value: totalUsers,   color: 'text-white' },
          { label: 'Pro Users',      value: proUsers,     color: 'text-violet-300' },
          { label: 'Admin Users',    value: adminUsers,   color: 'text-red-300' },
          { label: 'Total Searches', value: totalSearches, color: 'text-emerald-300' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card-dark rounded-xl p-4">
            <div className={`text-2xl font-black ${color}`}>{value}</div>
            <div className="text-xs text-white/35 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-pill-bar mb-5">
        <button className={`tab-pill${activeTab === 'users' ? ' active' : ''}`} onClick={() => setActiveTab('users')}>
          Users ({totalUsers})
        </button>
        <button className={`tab-pill${activeTab === 'providers' ? ' active' : ''}`} onClick={() => setActiveTab('providers')}>
          AI Provider Keys ({providers.filter(p => p.isSet).length}/{providers.length})
        </button>
      </div>

      {/* ── Users Tab ── */}
      {activeTab === 'users' && (
        <div className="card-dark rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  {['User', 'Role', 'Plan', 'Searches', 'Last Login', 'Actions'].map((h, i) => (
                    <th key={h} className={`px-4 py-3.5 text-xs font-semibold text-white/40 uppercase tracking-wide ${i === 0 ? 'text-left' : i <= 4 ? 'text-center' : 'text-right'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-white leading-snug">{u.name || '—'}</div>
                      <div className="text-xs text-white/35 mt-0.5">{u.email}</div>
                    </td>
                    <td className="px-4 py-3.5 text-center"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-3.5 text-center"><PlanBadge plan={u.plan} /></td>
                    <td className="px-4 py-3.5 text-center text-white/60 text-xs font-mono">{u.searchCount}</td>
                    <td className="px-4 py-3.5 text-center text-xs text-white/35">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        {/* Plan toggle */}
                        <select
                          disabled={updating === u.id}
                          value={u.plan}
                          onChange={e => updateUser(u.id, { plan: e.target.value })}
                          className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white/70 focus:outline-none focus:ring-1 focus:ring-violet-500 [&>option]:bg-[#0a0f1e] disabled:opacity-50 cursor-pointer">
                          <option value="free">Free</option>
                          <option value="pro">Pro</option>
                        </select>
                        {/* Role toggle */}
                        <select
                          disabled={updating === u.id}
                          value={u.role}
                          onChange={e => updateUser(u.id, { role: e.target.value })}
                          className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white/70 focus:outline-none focus:ring-1 focus:ring-red-500 [&>option]:bg-[#0a0f1e] disabled:opacity-50 cursor-pointer">
                          <option value="member">Member</option>
                          <option value="owner">Owner</option>
                          <option value="admin">Admin</option>
                        </select>
                        {updating === u.id && <span className="text-xs text-white/35 animate-pulse">saving…</span>}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-white/30 text-sm">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Provider Keys Tab ── */}
      {activeTab === 'providers' && (
        <div className="space-y-3">
          <div className="card-dark rounded-xl p-4 bg-amber-500/5 border-amber-500/15 mb-2">
            <div className="flex items-start gap-2 text-sm text-amber-200/80">
              <span className="text-base shrink-0">⚠️</span>
              <span>These keys are used server-side for all AI operations. Keep them secret. Only admin users can view or change them.</span>
            </div>
          </div>
          {providers.map(p => (
            <div key={p.id} className="card-dark rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold text-white text-sm">{p.label}</div>
                  <div className="text-xs text-white/35 mt-0.5">{p.hint}</div>
                </div>
                {p.isSet ? (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">
                    ✓ Set {p.source === 'env' ? '(env)' : '(db)'}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-white/5 text-white/30 border border-white/10">
                    Not set
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  placeholder={p.isSet ? (p.masked ?? 'Update key...') : `Enter ${p.label} API key...`}
                  value={providerDraft[p.id] ?? ''}
                  onChange={e => setProviderDraft(d => ({ ...d, [p.id]: e.target.value }))}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50"
                />
                {p.isSet && (
                  <button
                    onClick={() => setProviderDraft(d => ({ ...d, [p.id]: '' }))}
                    title="Clear key (removes DB override, falls back to env)"
                    className="text-xs px-3 py-2 rounded-xl border border-red-500/20 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors whitespace-nowrap">
                    Clear
                  </button>
                )}
              </div>
            </div>
          ))}
          {Object.values(providerDraft).some(v => v !== undefined) && (
            <button
              onClick={saveProviders}
              disabled={saving}
              className="w-full btn-primary text-sm disabled:opacity-50">
              {saving ? '⟳ Saving…' : '💾 Save Provider Keys'}
            </button>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur text-white text-sm px-5 py-2.5 rounded-xl border border-white/15 shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
