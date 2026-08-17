'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, isAdmin } from '@/lib/api';

const PROVIDERS = [
  { id: 'anthropic', label: 'Anthropic (Claude)', hint: 'Claude 3.5 Sonnet / Haiku — highest reasoning quality', placeholder: 'sk-ant-api03-...', docsUrl: 'https://console.anthropic.com/keys' },
  { id: 'openai',    label: 'OpenAI',             hint: 'GPT-4o, o1 — strong general analysis',                  placeholder: 'sk-proj-...',       docsUrl: 'https://platform.openai.com/api-keys' },
  { id: 'groq',      label: 'Groq',               hint: 'Llama 3, Mixtral — fast inference, free tier',          placeholder: 'gsk_...',           docsUrl: 'https://console.groq.com/keys' },
  { id: 'mistral',   label: 'Mistral',            hint: 'Mistral Large, Codestral',                               placeholder: 'sk-...',            docsUrl: 'https://console.mistral.ai/api-keys/' },
  { id: 'xai',       label: 'xAI (Grok)',         hint: 'Grok-2, Grok-3 — strong reasoning',                     placeholder: 'xai-...',           docsUrl: 'https://console.x.ai/' },
  { id: 'gemini',    label: 'Google Gemini',      hint: 'Gemini 1.5 & 2.0',                                      placeholder: 'AIzaSy...',         docsUrl: 'https://aistudio.google.com/app/apikey' },
  { id: 'cohere',    label: 'Cohere',             hint: 'Command R+',                                             placeholder: '...',               docsUrl: 'https://dashboard.cohere.com/api-keys' },
];

type ProviderStatus = {
  id: string; isSet: boolean; masked: string | null; source: 'db' | 'env' | 'none';
};

export default function AiKeysPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState<ProviderStatus[]>([]);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin()) { router.replace('/opportunities'); return; }
    api.settings.getAiProviderKeys()
      .then((data: any) => {
        setStatuses(data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  async function save(providerId: string) {
    const value = editing[providerId]?.trim();
    if (!value) return;
    setSaving(providerId);
    setError(null);
    try {
      await api.settings.updateAiProviderKeys({ [providerId]: value });
      setSaved(providerId);
      setEditing(prev => { const n = { ...prev }; delete n[providerId]; return n; });
      const fresh: any = await api.settings.getAiProviderKeys();
      setStatuses(fresh ?? []);
      setTimeout(() => setSaved(null), 2500);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save key');
    } finally {
      setSaving(null);
    }
  }

  async function remove(providerId: string) {
    setSaving(providerId);
    setError(null);
    try {
      await api.settings.updateAiProviderKeys({ [providerId]: '' });
      const fresh: any = await api.settings.getAiProviderKeys();
      setStatuses(fresh ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to remove key');
    } finally {
      setSaving(null);
    }
  }

  const getStatus = (id: string): ProviderStatus =>
    statuses.find(s => s.id === id) ?? { id, isSet: false, masked: null, source: 'none' };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-7">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-white">AI Provider Keys</h1>
          <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-red-500/15 text-red-300 border border-red-500/20 uppercase tracking-widest">Admin only</span>
        </div>
        <p className="text-sm text-white/40 leading-relaxed">
          Server-side API keys used by the AI agent pipeline. Keys are stored encrypted in the database and never exposed client-side. Env-var keys take precedence over DB keys.
        </p>
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {PROVIDERS.map(prov => {
          const status = getStatus(prov.id);
          const isEditing = prov.id in editing;
          const isSaving = saving === prov.id;
          const isSaved = saved === prov.id;

          return (
            <div key={prov.id} className="card-dark rounded-xl p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{prov.label}</span>
                    {status.source === 'env' && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/20">ENV VAR</span>
                    )}
                    {status.source === 'db' && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-300 border border-green-500/20">DB KEY</span>
                    )}
                    {status.source === 'none' && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/5 text-white/50 border border-white/10">NOT SET</span>
                    )}
                  </div>
                  <p className="text-xs text-white/55 mt-0.5">{prov.hint}</p>
                </div>
                <a href={prov.docsUrl} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 text-[10px] text-violet-400/60 hover:text-violet-300 transition-colors whitespace-nowrap">
                  Get key →
                </a>
              </div>

              {status.isSet && !isEditing ? (
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-white/50 bg-white/5 rounded-lg px-3 py-2 font-mono truncate">
                    {status.masked ?? '••••••••••••••••'}
                  </code>
                  <button onClick={() => setEditing(prev => ({ ...prev, [prov.id]: '' }))}
                    disabled={isSaving}
                    className="text-xs px-3 py-2 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all">
                    Replace
                  </button>
                  {status.source === 'db' && (
                    <button onClick={() => remove(prov.id)} disabled={isSaving}
                      className="text-xs px-3 py-2 rounded-lg border border-red-500/20 text-red-400/60 hover:text-red-300 hover:bg-red-500/8 transition-all">
                      {isSaving ? '…' : 'Remove'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={editing[prov.id] ?? ''}
                    onChange={e => setEditing(prev => ({ ...prev, [prov.id]: e.target.value }))}
                    placeholder={prov.placeholder}
                    className="flex-1 bg-white/5 border border-white/10 focus:border-violet-500/50 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none font-mono transition-colors"
                    onKeyDown={e => e.key === 'Enter' && save(prov.id)}
                  />
                  <button onClick={() => save(prov.id)}
                    disabled={isSaving || !editing[prov.id]?.trim()}
                    className="text-xs px-4 py-2 rounded-lg font-semibold bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors whitespace-nowrap">
                    {isSaving ? '…' : isSaved ? '✓ Saved' : 'Save'}
                  </button>
                  {isEditing && status.isSet && (
                    <button onClick={() => setEditing(prev => { const n = { ...prev }; delete n[prov.id]; return n; })}
                      className="text-xs px-3 py-2 rounded-lg border border-white/10 text-white/40 hover:text-white transition-colors">
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-white/50 leading-relaxed">
        Changes apply immediately to new AI pipeline runs. Existing queued jobs use the keys that were active at queue time.
        ENV VAR keys (set in Vercel / server environment) cannot be updated here.
      </p>
    </div>
  );
}
