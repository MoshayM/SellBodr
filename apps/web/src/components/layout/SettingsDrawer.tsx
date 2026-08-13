'use client';
import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';

type Tab = 'ai-keys' | 'password';

const PROVIDERS = [
  { id: 'anthropic', label: 'Anthropic',   hint: 'Claude models',            placeholder: 'sk-ant-api03-…',  docsUrl: 'https://console.anthropic.com/keys' },
  { id: 'openai',    label: 'OpenAI',       hint: 'GPT-4o, o1 & more',        placeholder: 'sk-proj-…',       docsUrl: 'https://platform.openai.com/api-keys' },
  { id: 'xai',       label: 'xAI · Grok', hint: 'Grok-2, Grok-3',       placeholder: 'xai-…',           docsUrl: 'https://console.x.ai/' },
  { id: 'gemini',    label: 'Gemini',       hint: 'Gemini 1.5 & 2.0',         placeholder: 'AIzaSy…',         docsUrl: 'https://aistudio.google.com/app/apikey' },
  { id: 'mistral',   label: 'Mistral',      hint: 'Mistral Large, Codestral', placeholder: '…',               docsUrl: 'https://console.mistral.ai/api-keys/' },
  { id: 'cohere',    label: 'Cohere',       hint: 'Command R+',               placeholder: '…',               docsUrl: 'https://dashboard.cohere.com/api-keys' },
];

type ProviderStatus = { id: string; label: string; hint: string; isSet: boolean; masked: string | null; source: string };

interface Props { open: boolean; onClose: () => void }

export default function SettingsDrawer({ open, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('ai-keys');
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-200 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 h-full w-[480px] max-w-full z-50 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Account Settings</h2>
            <p className="text-xs text-gray-400 mt-0.5">Manage AI providers and security</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors text-lg">
            &times;
          </button>
        </div>

        <div className="flex border-b border-gray-100 px-6">
          {([
            { key: 'ai-keys' as Tab,  label: 'AI Provider Keys' },
            { key: 'password' as Tab, label: 'Password' },
          ]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-1 py-3 mr-6 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? 'border-green-600 text-green-700' : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === 'ai-keys'  && <AiKeysPanel />}
          {tab === 'password' && <PasswordPanel />}
        </div>
      </div>
    </>
  );
}

function AiKeysPanel() {
  const [statuses, setStatuses] = useState<ProviderStatus[]>([]);
  const [drafts,   setDrafts]   = useState<Record<string, string>>({});
  const [shown,    setShown]    = useState<Record<string, boolean>>({});
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    api.settings.getAiProviderKeys().then((r: any) => setStatuses(r)).catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!Object.keys(drafts).length) return;
    setSaving(true); setError('');
    try {
      await api.settings.updateAiProviderKeys(drafts);
      const r: any = await api.settings.getAiProviderKeys();
      setStatuses(r); setDrafts({}); setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) { setError(err.message || 'Save failed.'); }
    setSaving(false);
  }

  return (
    <form onSubmit={save} className="p-6 space-y-3">
      <p className="text-xs text-gray-400 mb-4 leading-relaxed">
        Keys saved here override server environment variables instantly. Leave blank to keep the current value.
      </p>

      {PROVIDERS.map(p => {
        const st    = statuses.find(s => s.id === p.id);
        const draft = drafts[p.id] ?? '';
        const show  = shown[p.id] ?? false;

        return (
          <div key={p.id} className="rounded-xl border border-gray-200 p-4 bg-white hover:border-gray-300 transition-colors">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${st?.isSet ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm font-medium text-gray-800">{p.label}</span>
                <span className="text-xs text-gray-400">{p.hint}</span>
              </div>
              <div className="flex items-center gap-2">
                {st?.source === 'env' && <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 rounded px-1.5 py-0.5">env</span>}
                {st?.source === 'db'  && <span className="text-[10px] bg-green-50 text-green-600 border border-green-200 rounded px-1.5 py-0.5">saved</span>}
                <a href={p.docsUrl} target="_blank" rel="noreferrer" className="text-[10px] text-gray-400 hover:text-gray-600 underline">Get key &uarr;</a>
              </div>
            </div>

            {st?.isSet && !draft && (
              <div className="font-mono text-[11px] text-gray-400 bg-gray-50 rounded-lg px-3 py-1.5 mb-2.5 tracking-widest">
                {st.masked}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type={show ? 'text' : 'password'}
                value={draft}
                onChange={e => { setDrafts(d => ({ ...d, [p.id]: e.target.value })); setSaved(false); }}
                placeholder={st?.isSet ? 'Enter new key to replace…' : p.placeholder}
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <button type="button" onClick={() => setShown(s => ({ ...s, [p.id]: !s[p.id] }))}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
                {show ? 'Hide' : 'Show'}
              </button>
              {st?.isSet && (
                <button type="button" onClick={() => setDrafts(d => ({ ...d, [p.id]: '' }))}
                  className="px-3 py-1.5 text-xs border border-red-200 rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                  &times;
                </button>
              )}
            </div>
          </div>
        );
      })}

      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={saving || !Object.keys(drafts).length}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-40 transition-colors">
          {saving ? 'Saving…' : 'Save Keys'}
        </button>
        {saved && <span className="text-xs text-green-600 font-medium">&check; Saved</span>}
      </div>
    </form>
  );
}

function PasswordPanel() {
  const [form,   setForm]   = useState({ cur: '', next: '', confirm: '' });
  const [status, setStatus] = useState<'idle'|'loading'|'ok'|'err'>('idle');
  const [error,  setError]  = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (form.next.length < 8) { setError('New password must be at least 8 characters.'); return; }
    if (form.next !== form.confirm) { setError('Passwords do not match.'); return; }
    setStatus('loading');
    try {
      await api.settings.changePassword({ currentPassword: form.cur, newPassword: form.next });
      setStatus('ok'); setForm({ cur: '', next: '', confirm: '' });
    } catch (err: any) { setError(err.message || 'Failed to change password.'); setStatus('err'); }
  }

  return (
    <form onSubmit={submit} className="p-6 space-y-4">
      {[
        { key: 'cur',     label: 'Current Password',    ac: 'current-password' },
        { key: 'next',    label: 'New Password',         ac: 'new-password',    hint: 'Minimum 8 characters' },
        { key: 'confirm', label: 'Confirm New Password', ac: 'new-password' },
      ].map(f => (
        <div key={f.key}>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{f.label}</label>
          <input type="password" required autoComplete={f.ac}
            value={(form as any)[f.key]}
            onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
          {(f as any).hint && <p className="text-xs text-gray-400 mt-1">{(f as any).hint}</p>}
        </div>
      ))}

      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {status === 'ok' && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          &check; Password changed. All other sessions have been signed out.
        </p>
      )}

      <button type="submit" disabled={status === 'loading'}
        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-40 transition-colors">
        {status === 'loading' ? 'Saving…' : 'Change Password'}
      </button>
    </form>
  );
}
