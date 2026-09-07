'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getUser, isPro } from '@/lib/api';

const ROLES = ['viewer', 'analyst', 'manager', 'admin'];
const ROLE_DESC: Record<string, string> = {
  viewer:   'Read-only access to all opportunities and reports',
  analyst:  'Can run scans and generate assets',
  manager:  'Full access except team and billing management',
  admin:    'Full access including team and billing',
};
function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    viewer:  'bg-slate-100 text-slate-500 border-slate-200',
    analyst: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    manager: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    admin:   'bg-red-50 text-red-600 border-red-100',
  };
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize border ${styles[role] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
      {role}
    </span>
  );
}

function Avatar({ name, email }: { name?: string; email?: string }) {
  const initials = name ? name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : (email?.[0] || '?').toUpperCase();
  const hue = (email || name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 ring-2 ring-white shadow-sm"
      style={{ background: `hsl(${hue},55%,45%)` }}>
      {initials}
    </div>
  );
}

export default function TeamPage() {
  const qc = useQueryClient();
  const [user, setUser]         = useState<any>(null);
  const [isOrg, setIsOrg]       = useState(false);
  const [inviteEmail, setEmail]  = useState('');
  const [inviteRole, setRole]    = useState('analyst');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole]  = useState('');

  useEffect(() => {
    const u = getUser();
    setUser(u);
    // Treat admin as org for demo; real check: u?.plan === 'organisation'
    setIsOrg(u?.plan === 'pro' || u?.plan === 'organisation' || u?.role === 'admin');
  }, []);

  const { data: members = [], isLoading: membersLoading } = useQuery<any[]>({
    queryKey: ['team-members'],
    queryFn: () => api.team.list(),
    enabled: isOrg,
    retry: false,
  });

  const { data: invites = [] } = useQuery<any[]>({
    queryKey: ['team-invites'],
    queryFn: () => api.team.getInvites(),
    enabled: isOrg,
    retry: false,
  });

  const invite = useMutation({
    mutationFn: () => api.team.invite(inviteEmail.trim(), inviteRole),
    onSuccess: () => {
      setInviteSuccess(`Invitation sent to ${inviteEmail}`);
      setEmail('');
      setTimeout(() => setInviteSuccess(''), 4000);
      qc.invalidateQueries({ queryKey: ['team-invites'] });
    },
    onError: (e: any) => setInviteError(e?.message || 'Failed to send invite'),
  });

  const remove = useMutation({
    mutationFn: (userId: string) => api.team.remove(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-members'] }),
  });

  const updateRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => api.team.update(userId, role),
    onSuccess: () => {
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ['team-members'] });
    },
  });

  const cancelInvite = useMutation({
    mutationFn: (inviteId: string) => api.team.cancelInvite(inviteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-invites'] }),
  });

  function handleInvite() {
    setInviteError('');
    if (!inviteEmail.trim()) { setInviteError('Email is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) { setInviteError('Enter a valid email'); return; }
    invite.mutate();
  }

  // Non-pro/org gate
  if (!isOrg) return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-7">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-violet-600 bg-violet-50 border border-violet-100 px-3 py-1 rounded-full mb-3">
          Team
        </span>
        <h1 className="font-black text-2xl text-slate-900 mb-1">Team</h1>
        <p className="text-slate-500 text-sm">Manage your team members and permissions</p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 sm:p-12 text-center animate-card-in stagger-1">
        <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center text-3xl mx-auto mb-5">👥</div>
        <h2 className="font-black text-xl text-slate-900 mb-2">Multi-seat access is an Organisation feature</h2>
        <p className="text-sm text-slate-500 leading-relaxed mb-6 max-w-md mx-auto">
          Invite team members, set roles (Viewer, Analyst, Manager, Admin), and manage permissions across your entire catalogue — available on the Organisation plan.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-7 text-left">
          {[
            { icon: '🔒', title: 'Role-based access', desc: '4 permission levels from read-only to full admin' },
            { icon: '📩', title: 'Email invitations', desc: 'Invite by email — teammates join in one click' },
            { icon: '📊', title: 'Shared portfolio', desc: 'All team scans visible across the organisation' },
          ].map((f, i) => (
            <div key={f.title} className={`bg-slate-50 rounded-xl border border-slate-100 p-4 animate-card-in stagger-${i + 2}`}>
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="text-sm font-bold text-slate-800 mb-1">{f.title}</div>
              <div className="text-xs text-slate-500 leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
        <a href="mailto:sellbodr@gmail.com?subject=Organisation Plan Enquiry"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white text-sm shadow-lg"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
          Contact us for Organisation pricing →
        </a>
      </div>
    </div>
  );

  const totalSeats = 5; // placeholder; real value from billing
  const usedSeats  = (members as any[]).length;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-violet-600 bg-violet-50 border border-violet-100 px-3 py-1 rounded-full mb-3">
            Team
          </span>
          <h1 className="font-black text-2xl text-slate-900 mb-1">Team</h1>
          <p className="text-slate-500 text-sm">Manage team members and invitations</p>
        </div>
        <div className="text-right shrink-0 mt-1">
          <div className="text-sm font-bold text-slate-800">{usedSeats} / {totalSeats}</div>
          <div className="text-xs text-slate-400">seats used</div>
          {/* Seat bar */}
          <div className="w-24 h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
              style={{ width: `${Math.min(100, (usedSeats / totalSeats) * 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Invite form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 mb-5 animate-card-in stagger-1">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Invite Team Member</div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input type="email" value={inviteEmail}
            onChange={e => { setEmail(e.target.value); setInviteError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleInvite()}
            placeholder="colleague@company.com"
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-300 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50" />
          <select value={inviteRole} onChange={e => setRole(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 capitalize">
            {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
          <button onClick={handleInvite} disabled={invite.isPending}
            className="btn-primary text-sm px-5 disabled:opacity-50 rounded-xl whitespace-nowrap">
            {invite.isPending ? '⟳ Sending…' : '📩 Invite'}
          </button>
        </div>
        {inviteError   && <p className="text-xs text-rose-500 mt-2">{inviteError}</p>}
        {inviteSuccess && <p className="text-xs text-emerald-600 mt-2">✓ {inviteSuccess}</p>}
        {inviteRole && (
          <p className="text-xs text-slate-400 mt-2">{ROLE_DESC[inviteRole]}</p>
        )}
      </div>

      {/* Pending invites */}
      {(invites as any[]).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4 animate-card-in stagger-2">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-widest">
            Pending Invitations ({(invites as any[]).length})
          </div>
          <div className="divide-y divide-slate-100">
            {(invites as any[]).map((inv: any) => (
              <div key={inv.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 text-sm shrink-0">
                  ✉
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-700 font-medium">{inv.email}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <RoleBadge role={inv.role} />
                    <span className="text-[10px] text-slate-400">Invite sent {inv.sentAt ? new Date(inv.sentAt).toLocaleDateString() : ''}</span>
                  </div>
                </div>
                <span className="text-[10px] text-amber-600 border border-amber-200 bg-amber-50 px-2 py-0.5 rounded-full shrink-0 font-semibold">Pending</span>
                <button onClick={() => cancelInvite.mutate(inv.id)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition-all">
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-card-in stagger-3">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-widest">
          Members ({usedSeats})
        </div>

        {membersLoading ? (
          <div className="p-8 text-center"><div className="animate-spin text-2xl text-indigo-500">⟳</div></div>
        ) : (members as any[]).length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-2xl mx-auto mb-3">👥</div>
            <p className="text-sm text-slate-400 font-medium">No team members yet. Invite your first colleague above.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {/* Current user first */}
            {user && (
              <div className="px-4 py-3.5 flex items-center gap-3 bg-indigo-50/40">
                <Avatar name={user.name} email={user.email} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800">{user.name || 'You'} <span className="text-[10px] text-slate-400 ml-1 font-normal">(you)</span></div>
                  <div className="text-xs text-slate-400 truncate">{user.email}</div>
                </div>
                <RoleBadge role={user.role || 'admin'} />
              </div>
            )}
            {(members as any[])
              .filter((m: any) => m.id !== user?.id)
              .map((m: any) => (
                <div key={m.id} className="px-4 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                  <Avatar name={m.name} email={m.email} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-700">{m.name || 'Unnamed'}</div>
                    <div className="text-xs text-slate-400 truncate">{m.email}</div>
                  </div>

                  {editingId === m.id ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <select value={editRole} onChange={e => setEditRole(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-400">
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <button onClick={() => updateRole.mutate({ userId: m.id, role: editRole })}
                        disabled={updateRole.isPending}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors font-semibold">
                        Save
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 transition-colors">
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      <RoleBadge role={m.role || 'viewer'} />
                      <button onClick={() => { setEditingId(m.id); setEditRole(m.role || 'viewer'); }}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-all font-medium">
                        Edit
                      </button>
                      <button onClick={() => { if (confirm(`Remove ${m.name || m.email} from the team?`)) remove.mutate(m.id); }}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-red-100 text-red-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all font-medium">
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Role reference */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mt-4 animate-card-in stagger-4">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Role Reference</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ROLES.map(r => (
            <div key={r} className="flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <RoleBadge role={r} />
              <span className="text-xs text-slate-400 leading-relaxed">{ROLE_DESC[r]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
