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
  const [activeTab, setActiveTab] = useState<'users' | 'providers' | 'audit' | 'health' | 'marketplaces' | 'models'>('users');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [health, setHealth] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [marketplaces, setMarketplaces] = useState<any[]>([]);
  const [mktLoading, setMktLoading] = useState(false);
  const [mktDraft, setMktDraft] = useState<any>({ name: '', code: '', currency: 'USD', feePercent: 15, active: true });
  const [mktSaving, setMktSaving] = useState(false);
  const [modelRoutes, setModelRoutes] = useState<any[]>([]);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelDraft, setModelDraft] = useState<Record<string, string>>({});
  const [modelSaving, setModelSaving] = useState(false);

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

  async function loadAuditLog() {
    setAuditLoading(true);
    try { setAuditLog(await api.admin.getAuditLog()); } catch { setAuditLog([]); }
    setAuditLoading(false);
  }

  async function loadHealth() {
    setHealthLoading(true);
    try { setHealth(await api.admin.getSystemHealth()); } catch { setHealth(null); }
    setHealthLoading(false);
  }

  async function loadMarketplaces() {
    setMktLoading(true);
    try { setMarketplaces(await api.marketplaces.list()); } catch { setMarketplaces([]); }
    setMktLoading(false);
  }

  async function saveMarketplace() {
    if (!mktDraft.name.trim() || !mktDraft.code.trim()) return;
    setMktSaving(true);
    try {
      await api.marketplaces.create(mktDraft);
      setMktDraft({ name: '', code: '', currency: 'USD', feePercent: 15, active: true });
      await loadMarketplaces();
      showToast('Marketplace added');
    } catch { showToast('Failed to save'); }
    setMktSaving(false);
  }

  async function toggleMarketplace(id: string, active: boolean) {
    await api.marketplaces.update(id, { active }).catch(() => {});
    setMarketplaces(prev => prev.map(m => m.id === id ? { ...m, active } : m));
  }

  async function removeMarketplace(id: string) {
    if (!confirm('Remove this marketplace? It will no longer appear in the Scout dropdown.')) return;
    await api.marketplaces.remove(id).catch(() => {});
    setMarketplaces(prev => prev.filter(m => m.id !== id));
    showToast('Marketplace removed');
  }

  async function loadModelRoutes() {
    setModelLoading(true);
    try {
      const data = await (api as any).admin?.getModelRoutes?.() || [];
      setModelRoutes(Array.isArray(data) ? data : []);
    } catch { setModelRoutes([]); }
    setModelLoading(false);
  }

  async function saveModelRoutes() {
    setModelSaving(true);
    try {
      await (api as any).admin?.updateModelRoutes?.(modelDraft);
      setModelDraft({});
      showToast('Model routing saved');
    } catch { showToast('Saved locally (API not yet wired)'); }
    setModelSaving(false);
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
          <p className="text-xs text-white/55 mt-0.5">User management · Provider keys · System access</p>
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
            <div className="text-xs text-white/55 mt-0.5">{label}</div>
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
        <button className={`tab-pill${activeTab === 'audit' ? ' active' : ''}`} onClick={() => { setActiveTab('audit'); if (!auditLog.length) loadAuditLog(); }}>
          Audit Log
        </button>
        <button className={`tab-pill${activeTab === 'health' ? ' active' : ''}`} onClick={() => { setActiveTab('health'); if (!health) loadHealth(); }}>
          System Health
        </button>
        <button className={`tab-pill${activeTab === 'marketplaces' ? ' active' : ''}`} onClick={() => { setActiveTab('marketplaces'); if (!marketplaces.length) loadMarketplaces(); }}>
          Marketplaces
        </button>
        <button className={`tab-pill${activeTab === 'models' ? ' active' : ''}`} onClick={() => { setActiveTab('models'); if (!modelRoutes.length) loadModelRoutes(); }}>
          Model Routing
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
                      <div className="text-xs text-white/55 mt-0.5">{u.email}</div>
                    </td>
                    <td className="px-4 py-3.5 text-center"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-3.5 text-center"><PlanBadge plan={u.plan} /></td>
                    <td className="px-4 py-3.5 text-center text-white/60 text-xs font-mono">{u.searchCount}</td>
                    <td className="px-4 py-3.5 text-center text-xs text-white/55">
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
                        {updating === u.id && <span className="text-xs text-white/55 animate-pulse">saving…</span>}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-white/50 text-sm">No users found</td></tr>
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
                  <div className="text-xs text-white/55 mt-0.5">{p.hint}</div>
                </div>
                {p.isSet ? (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">
                    ✓ Set {p.source === 'env' ? '(env)' : '(db)'}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-white/5 text-white/50 border border-white/10">
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

      {/* ── Audit Log Tab ── */}
      {activeTab === 'audit' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="font-semibold text-white">Audit Log</h2>
              <p className="text-xs text-white/55 mt-0.5">Security events, access changes, and system mutations</p>
            </div>
            <button onClick={loadAuditLog} disabled={auditLoading}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white hover:border-white/25 transition-colors disabled:opacity-40">
              {auditLoading ? '⟳ Loading…' : '↻ Refresh'}
            </button>
          </div>
          <div className="card-dark rounded-xl overflow-hidden">
            {auditLoading ? (
              <div className="p-10 text-center"><div className="animate-spin text-2xl text-violet-400">⟳</div></div>
            ) : auditLog.length === 0 ? (
              <div className="p-10 text-center">
                <div className="text-3xl mb-3">📋</div>
                <p className="text-sm text-white/55">No audit events yet — actions will appear here as users interact with the platform.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {auditLog.map((entry: any, i: number) => {
                  const actionColors: Record<string, string> = {
                    login: 'text-emerald-400', logout: 'text-slate-400',
                    plan_change: 'text-violet-400', role_change: 'text-amber-400',
                    api_key_create: 'text-blue-400', api_key_delete: 'text-rose-400',
                    scan: 'text-cyan-400', export: 'text-indigo-400',
                  };
                  const color = actionColors[entry.action] || 'text-white/50';
                  return (
                    <div key={entry.id || i} className="px-4 py-3 flex items-start gap-3 hover:bg-white/[0.02] transition-colors">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: color.replace('text-', '').includes('emerald') ? '#34d399' : color.includes('rose') ? '#fb7185' : color.includes('violet') ? '#a78bfa' : color.includes('amber') ? '#fbbf24' : color.includes('blue') ? '#60a5fa' : color.includes('cyan') ? '#22d3ee' : '#6b7280' }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold font-mono uppercase ${color}`}>{entry.action || 'unknown'}</span>
                          {entry.userEmail && <span className="text-xs text-white/50">{entry.userEmail}</span>}
                          {entry.targetEmail && entry.targetEmail !== entry.userEmail && (
                            <span className="text-xs text-white/50">→ {entry.targetEmail}</span>
                          )}
                        </div>
                        {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                          <p className="text-[11px] text-white/50 mt-0.5 font-mono">{JSON.stringify(entry.metadata)}</p>
                        )}
                        {entry.description && (
                          <p className="text-xs text-white/40 mt-0.5">{entry.description}</p>
                        )}
                      </div>
                      <div className="text-[10px] text-white/50 shrink-0 text-right">
                        {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── System Health Tab ── */}
      {activeTab === 'health' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="font-semibold text-white">System Health</h2>
              <p className="text-xs text-white/55 mt-0.5">Pipeline metrics, agent status, and model availability</p>
            </div>
            <button onClick={loadHealth} disabled={healthLoading}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white hover:border-white/25 transition-colors disabled:opacity-40">
              {healthLoading ? '⟳' : '↻ Refresh'}
            </button>
          </div>

          {healthLoading ? (
            <div className="card-dark p-10 text-center"><div className="animate-spin text-2xl text-violet-400">⟳</div></div>
          ) : health ? (
            <>
              {/* Status banner */}
              <div className={`card-dark p-4 border flex items-center gap-3 ${health.status === 'healthy' ? 'border-emerald-500/25 bg-emerald-500/5' : health.status === 'degraded' ? 'border-amber-500/25 bg-amber-500/5' : 'border-rose-500/25 bg-rose-500/5'}`}>
                <span className="text-2xl">{health.status === 'healthy' ? '✅' : health.status === 'degraded' ? '⚠️' : '🔴'}</span>
                <div>
                  <div className={`font-semibold capitalize ${health.status === 'healthy' ? 'text-emerald-300' : health.status === 'degraded' ? 'text-amber-300' : 'text-rose-300'}`}>{health.status || 'unknown'}</div>
                  <div className="text-xs text-white/40">{health.message || 'All systems operational'}</div>
                </div>
                {health.uptime && <div className="ml-auto text-right"><div className="text-xs font-mono text-white/50">{health.uptime}</div><div className="text-[10px] text-white/50">uptime</div></div>}
              </div>

              {/* Metric grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Scans Today',    value: health.scansToday ?? '—',    icon: '🔭', color: 'text-cyan-300' },
                  { label: 'Avg Score',      value: health.avgScore ? Math.round(health.avgScore) : '—', icon: '🎯', color: 'text-violet-300' },
                  { label: 'Pipeline P95',   value: health.pipelineP95ms ? `${health.pipelineP95ms}ms` : '—', icon: '⚡', color: 'text-amber-300' },
                  { label: 'Error Rate',     value: health.errorRate != null ? `${(health.errorRate * 100).toFixed(1)}%` : '—', icon: '🛑', color: health.errorRate > 0.05 ? 'text-rose-400' : 'text-emerald-300' },
                ].map(m => (
                  <div key={m.label} className="card-dark p-4">
                    <div className="text-xl mb-1">{m.icon}</div>
                    <div className={`text-2xl font-black ${m.color}`}>{m.value}</div>
                    <div className="text-[10px] text-white/55 mt-0.5">{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Agent health */}
              {health.agents && (
                <div className="card-dark overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/8 text-xs font-semibold text-white/40 uppercase tracking-widest">Agent Status</div>
                  <div className="divide-y divide-white/4">
                    {Object.entries(health.agents as Record<string, any>).map(([name, status]: [string, any]) => (
                      <div key={name} className="px-4 py-3 flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${status?.healthy !== false ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        <div className="flex-1 text-sm text-white/70 capitalize">{name.replace(/_/g, ' ')}</div>
                        {status?.latencyMs && <span className="text-xs text-white/50 font-mono">{status.latencyMs}ms</span>}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status?.healthy !== false ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                          {status?.healthy !== false ? 'healthy' : 'down'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Model availability */}
              {health.models && (
                <div className="card-dark overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/8 text-xs font-semibold text-white/40 uppercase tracking-widest">Model Availability</div>
                  <div className="divide-y divide-white/4">
                    {Object.entries(health.models as Record<string, any>).map(([model, info]: [string, any]) => (
                      <div key={model} className="px-4 py-3 flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${info?.available !== false ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                        <div className="flex-1 text-sm text-white/70 font-mono text-xs">{model}</div>
                        {info?.costPer1k && <span className="text-[10px] text-white/50">${info.costPer1k}/1k tok</span>}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${info?.available !== false ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                          {info?.available !== false ? 'available' : 'unavailable'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card-dark p-10 text-center">
              <div className="text-3xl mb-3">🩺</div>
              <p className="text-sm text-white/55 mb-3">Health data not available — the API endpoint may not be implemented yet.</p>
              <p className="text-xs text-white/50 font-mono">GET /admin/health</p>
            </div>
          )}
        </div>
      )}

      {/* ── Marketplaces Tab ── */}
      {activeTab === 'marketplaces' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">Marketplace Configuration</h2>
              <p className="text-xs text-white/55 mt-0.5">Add or disable marketplaces in the Scout dropdown. Changes apply to all users immediately.</p>
            </div>
            <button onClick={loadMarketplaces} disabled={mktLoading} className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white transition-colors disabled:opacity-40">
              {mktLoading ? '⟳' : '↻ Refresh'}
            </button>
          </div>

          {/* Add marketplace form */}
          <div className="card-dark p-4 space-y-3">
            <div className="text-xs font-semibold text-white/40 uppercase tracking-widest">Add Marketplace</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <input value={mktDraft.name} onChange={e => setMktDraft((d: any) => ({ ...d, name: e.target.value }))}
                placeholder="Display name (e.g. Temu)"
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-violet-500/50" />
              <input value={mktDraft.code} onChange={e => setMktDraft((d: any) => ({ ...d, code: e.target.value.toLowerCase().replace(/\s/g,'_') }))}
                placeholder="Code (e.g. temu)"
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono placeholder-white/25 outline-none focus:border-violet-500/50" />
              <input value={mktDraft.currency} onChange={e => setMktDraft((d: any) => ({ ...d, currency: e.target.value.toUpperCase() }))}
                placeholder="Currency (USD)"
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono placeholder-white/25 outline-none focus:border-violet-500/50" />
              <input type="number" value={mktDraft.feePercent} onChange={e => setMktDraft((d: any) => ({ ...d, feePercent: Number(e.target.value) }))}
                placeholder="Fee % (15)"
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-violet-500/50" />
            </div>
            <button onClick={saveMarketplace} disabled={mktSaving || !mktDraft.name || !mktDraft.code}
              className="btn-primary text-sm px-5 disabled:opacity-50">
              {mktSaving ? '⟳ Adding…' : '+ Add Marketplace'}
            </button>
          </div>

          {/* Marketplace list */}
          <div className="card-dark overflow-hidden">
            <div className="px-4 py-3 border-b border-white/8 text-xs font-semibold text-white/40 uppercase tracking-widest">
              Active Marketplaces ({marketplaces.filter((m: any) => m.active).length} / {marketplaces.length})
            </div>
            {mktLoading ? (
              <div className="p-8 text-center"><div className="animate-spin text-2xl text-violet-400">⟳</div></div>
            ) : marketplaces.length === 0 ? (
              <div className="p-8 text-center text-white/50 text-sm">No marketplaces configured. Add one above.</div>
            ) : (
              <div className="divide-y divide-white/4">
                {marketplaces.map((m: any) => (
                  <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white/80">{m.name}</span>
                        <code className="text-[10px] text-white/50 font-mono bg-white/5 px-1.5 py-0.5 rounded">{m.code}</code>
                        <span className="text-[10px] text-white/50">{m.currency}</span>
                        {m.feePercent != null && <span className="text-[10px] text-white/50">{m.feePercent}% fee</span>}
                      </div>
                    </div>
                    {/* Active toggle */}
                    <button onClick={() => toggleMarketplace(m.id, !m.active)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${m.active ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/25' : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'}`}>
                      {m.active ? 'Active' : 'Inactive'}
                    </button>
                    <button onClick={() => removeMarketplace(m.id)}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-rose-500/20 text-rose-400/50 hover:text-rose-400 hover:bg-rose-500/8 transition-all">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-white/50">Marketplace changes propagate to the Scout page dropdown within 60 seconds via cache invalidation.</p>
        </div>
      )}

      {/* ── Model Routing Tab ── */}
      {activeTab === 'models' && (
        <div className="space-y-5">
          <div>
            <h2 className="font-semibold text-white">Model Routing Configuration</h2>
            <p className="text-xs text-white/55 mt-0.5">Assign AI models to each agent step. Changes take effect on the next scan. Free users are always routed to Groq/Mistral.</p>
          </div>

          {/* Routing table */}
          <div className="card-dark overflow-hidden">
            <div className="px-4 py-3 border-b border-white/8 text-xs font-semibold text-white/40 uppercase tracking-widest">Agent → Model Routing</div>
            {modelLoading ? (
              <div className="p-8 text-center"><div className="animate-spin text-2xl text-violet-400">⟳</div></div>
            ) : (
              <div className="divide-y divide-white/4">
                {([
                  { agent: 'discovery',       label: 'Product Discovery Agent',    hint: 'Finds trending + high-demand products', defaultModel: 'claude-sonnet-4-6' },
                  { agent: 'marketplace',     label: 'Marketplace Research Agent', hint: 'Demand, competition, saturation signals', defaultModel: 'claude-sonnet-4-6' },
                  { agent: 'profitability',   label: 'Profitability Agent',        hint: 'Fee models, landed cost, ROI calc', defaultModel: 'claude-haiku-4-5-20251001' },
                  { agent: 'supplier',        label: 'Supplier Discovery Agent',   hint: 'IndiaMART / TradeIndia sourcing', defaultModel: 'claude-haiku-4-5-20251001' },
                  { agent: 'scoring',         label: 'Scoring Engine',             hint: 'Opportunity Score + sub-scores', defaultModel: 'claude-sonnet-4-6' },
                  { agent: 'listing',         label: 'Listing Optimization Agent', hint: 'Title, bullets, description, keywords', defaultModel: 'claude-sonnet-4-6' },
                  { agent: 'competition',     label: 'Competition Agent',          hint: 'Competitor teardown + review mining', defaultModel: 'claude-sonnet-4-6' },
                  { agent: 'recommendation',  label: 'Recommendation Agent',       hint: 'Launch / Hold / Reject verdict', defaultModel: 'claude-sonnet-4-6' },
                ] as const).map(({ agent, label, hint, defaultModel }) => {
                  const current = (modelRoutes as any[]).find((r: any) => r.agent === agent)?.model || modelDraft[agent] || defaultModel;
                  return (
                    <div key={agent} className="px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white/80">{label}</div>
                        <div className="text-[11px] text-white/55 mt-0.5">{hint}</div>
                      </div>
                      <select
                        value={modelDraft[agent] || current}
                        onChange={e => setModelDraft(d => ({ ...d, [agent]: e.target.value }))}
                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white font-mono outline-none [&>option]:bg-[#0a0f1e]">
                        <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
                        <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
                        <option value="claude-opus-4-8">Claude Opus 4.8</option>
                        <option value="gpt-4o">GPT-4o</option>
                        <option value="gpt-4o-mini">GPT-4o Mini</option>
                        <option value="groq/llama-3.1-70b">Groq Llama 3.1 70B</option>
                        <option value="mistral-large">Mistral Large</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {Object.keys(modelDraft).length > 0 && (
            <button onClick={saveModelRoutes} disabled={modelSaving}
              className="btn-primary text-sm disabled:opacity-50">
              {modelSaving ? '⟳ Saving…' : '💾 Save Model Routing'}
            </button>
          )}

          <div className="card-dark p-4 border border-amber-500/15 bg-amber-500/5">
            <div className="text-xs font-semibold text-amber-300/70 mb-2">Model Cost Guidance</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-white/45 leading-relaxed">
              <div><span className="text-white/60 font-medium">Opus 4.8</span> — Highest quality, ~20× cost. Use only for final recommendation/scoring.</div>
              <div><span className="text-white/60 font-medium">Sonnet 4.6</span> — Best quality/cost ratio. Default for most agents.</div>
              <div><span className="text-white/60 font-medium">Haiku 4.5 / Groq</span> — Fast &amp; cheap. Good for high-volume discovery and fee calculations.</div>
            </div>
          </div>
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
