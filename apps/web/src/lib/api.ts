const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

// ── Guest free-key helpers (localStorage, no account needed) ─────────────────
const GUEST_KEY_STORAGE: Record<string, string> = {
  groq:    'bs_guest_groq_key',
  mistral: 'bs_guest_mistral_key',
};

export function getGuestKey(provider: string): string | null {
  if (typeof window === 'undefined') return null;
  const k = GUEST_KEY_STORAGE[provider];
  return k ? (localStorage.getItem(k) || null) : null;
}

export function setGuestKey(provider: string, value: string) {
  if (typeof window === 'undefined') return;
  const k = GUEST_KEY_STORAGE[provider];
  if (!k) return;
  if (value.trim()) localStorage.setItem(k, value.trim());
  else localStorage.removeItem(k);
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('bs_access_token');
}

let _refreshing: Promise<string | null> | null = null;

async function silentRefresh(): Promise<string | null> {
  if (_refreshing) return _refreshing;
  _refreshing = (async () => {
    try {
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('bs_refresh_token') : null;
      if (!refreshToken) return null;
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.accessToken) {
        localStorage.setItem('bs_access_token', data.accessToken);
        return data.accessToken as string;
      }
      return null;
    } catch {
      return null;
    } finally {
      _refreshing = null;
    }
  })();
  return _refreshing;
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  // Attach guest LLM keys as headers so server-side gateway can use them
  const guestHeaders: Record<string, string> = {};
  if (!token) {
    const gk = getGuestKey('groq');
    const mk = getGuestKey('mistral');
    if (gk) guestHeaders['X-Guest-Groq-Key']    = gk;
    if (mk) guestHeaders['X-Guest-Mistral-Key']  = mk;
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...guestHeaders,
      ...opts.headers,
    },
  });

  if (res.status === 401) {
    // Try silent token refresh before giving up
    if (typeof window !== 'undefined' && localStorage.getItem('bs_refresh_token')) {
      const newToken = await silentRefresh();
      if (newToken) {
        const retry = await fetch(`${API_URL}${path}`, {
          ...opts,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${newToken}`,
            ...opts.headers,
          },
        });
        if (retry.ok) return retry.json() as Promise<T>;
        if (retry.status !== 401) {
          const err = await retry.json().catch(() => ({ message: 'Request failed' }));
          throw new Error(err.message || err.error || 'Request failed');
        }
      }
    }
    // Refresh failed or no refresh token — clear session without page reload
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bs_access_token');
      localStorage.removeItem('bs_refresh_token');
      localStorage.removeItem('bs_user');
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message || err.error || 'Request failed');
  }

  return res.json();
}

export const api = {
  auth: {
    register: (name: string, email: string, password: string, orgName = 'My Organisation') =>
      request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, orgName }) }),
    login: (email: string, password: string) =>
      request<any>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    googleLogin: (credential: string) =>
      request<any>('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),
    refresh: (refreshToken: string) => request<{ accessToken: string; expiresIn: number }>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
    logout: (refreshToken: string) => request('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  },
  searches: {
    create: (data: any) => request<any>('/searches', { method: 'POST', body: JSON.stringify(data) }),
    list: () => request<any[]>('/searches'),
    get: (id: string) => request<any>(`/searches/${id}`),
  },
  opportunities: {
    list: (params?: any) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/opportunities${q}`);
    },
    get: (id: string) => request<any>(`/opportunities/${id}`),
    getProfit: (id: string) => request<any>(`/opportunities/${id}/profit`),
    getSuppliers: (id: string) => request<any[]>(`/opportunities/${id}/suppliers`),
    getListing: (id: string) => request<any>(`/opportunities/${id}/listing`),
    generateAssets: (id: string) => request<any>(`/opportunities/${id}/launch-assets`, { method: 'POST', body: '{}' }),
    generateReport: (id: string) => request<any>(`/opportunities/${id}/reports`, { method: 'POST', body: JSON.stringify({ format: 'json' }) }),
    recalculate: (id: string, data: any) => request<any>(`/opportunities/${id}/profit/recalculate`, { method: 'POST', body: JSON.stringify(data) }),
    getKeywords: (id: string) => request<any>(`/opportunities/${id}/keywords`),
    refresh: (id: string) => request<any>(`/opportunities/${id}/refresh`, { method: 'POST', body: '{}' }),
    generateAds: (id: string) => request<any>(`/opportunities/${id}/ads`, { method: 'POST', body: '{}' }),
    generateGrowth: (id: string) => request<any>(`/opportunities/${id}/growth`, { method: 'POST', body: '{}' }),
    generateBrand:  (id: string) => request<any>(`/opportunities/${id}/brand`,  { method: 'POST', body: '{}' }),
    generateBundle: (id: string) => request<any>(`/opportunities/${id}/bundle`, { method: 'POST', body: '{}' }),
    getAds:     (id: string) => request<any>(`/opportunities/${id}/ads`),
    getGrowth:  (id: string) => request<any>(`/opportunities/${id}/growth`),
    getBrand:   (id: string) => request<any>(`/opportunities/${id}/brand`),
    getBundle:  (id: string) => request<any>(`/opportunities/${id}/bundle`),
    getReports: (id: string) => request<any[]>(`/opportunities/${id}/reports`),
    deleteReport: (id: string, reportId: string) =>
      request<{ ok: boolean }>(`/opportunities/${id}/reports?reportId=${reportId}`, { method: 'DELETE' }),
    getCompetition: (id: string) => request<any>(`/opportunities/${id}/competition`),
    bulkScan:       (keywords: string[], marketplace: string) => request<any>('/opportunities/bulk-scan', { method: 'POST', body: JSON.stringify({ keywords, marketplace }) }),
    submitFeedback: (id: string, data: { rating: 'up' | 'down'; note?: string }) =>
      request<{ success: boolean }>(`/opportunities/${id}/feedback`, { method: 'POST', body: JSON.stringify(data) }),
    rescore: (id: string) => request<any>(`/opportunities/${id}/rescore`, { method: 'POST', body: '{}' }),
  },
  billing: {
    getSubscription: () => request<any>('/billing/subscription'),
    getPlans: () => request<any[]>('/billing/plans'),
    getCredits: () => request<{ credits: number | null; isAdmin: boolean }>('/billing/credits'),
    buyCredits: () => request<{ url: string }>('/billing/checkout', { method: 'POST', body: '{}' }),
  },
  marketplaces: {
    list: (params?: { active?: boolean }) => {
      const q = params ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))).toString() : '';
      return request<any[]>(`/marketplaces${q}`);
    },
    create: (data: any) => request<any>('/marketplaces', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/marketplaces/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: string) => request<{ success: boolean }>(`/marketplaces/${id}`, { method: 'DELETE' }),
  },
  suppliers: {
    list: () => request<any[]>('/suppliers'),
    getProfile: (id: string) => request<any>(`/suppliers/${id}`),
    getOutreach: (id: string) => request<any[]>(`/suppliers/${id}/outreach`),
    logOutreach: (id: string, data: { channel: string; subject?: string; messageBody?: string; opportunityId?: string }) =>
      request<any>(`/suppliers/${id}/outreach`, { method: 'POST', body: JSON.stringify(data) }),
    generateRfq: (id: string) =>
      request<any>(`/suppliers/${id}/rfq`, { method: 'POST', body: '{}' }),
  },
  pin: {
    set:    (pin: string) => request<{ success: boolean }>('/auth/pin/set', { method: 'POST', body: JSON.stringify({ pin }) }),
    login:  (email: string, pin: string) => request<any>('/auth/pin/login', { method: 'POST', body: JSON.stringify({ email, pin }) }),
    status: () => request<{ pinSet: boolean }>('/auth/pin/status'),
  },
  passkeys: {
    list: () => request<any[]>('/passkeys'),
    delete: (id: string) => request<{ success: boolean }>(`/passkeys/${id}`, { method: 'DELETE' }),
    rename: (id: string, name: string) => request<any>(`/passkeys/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
    registerBegin: (email?: string, name?: string) =>
      request<any>('/auth/passkey/register/begin', { method: 'POST', body: JSON.stringify({ email, name }) }),
    registerComplete: (challengeId: string, name: string, response: any, orgName?: string) =>
      request<any>('/auth/passkey/register/complete', { method: 'POST', body: JSON.stringify({ challengeId, name, orgName, response }) }),
    loginBegin: (email?: string) =>
      request<any>('/auth/passkey/login/begin', { method: 'POST', body: JSON.stringify({ email }) }),
    loginComplete: (challengeId: string, response: any) =>
      request<any>('/auth/passkey/login/complete', { method: 'POST', body: JSON.stringify({ challengeId, response }) }),
  },
  admin: {
    getUsers: () => request<any[]>('/admin/users'),
    updateUser: (userId: string, changes: { plan?: string; role?: string }) =>
      request<{ success: boolean }>('/admin/users', { method: 'PATCH', body: JSON.stringify({ userId, ...changes }) }),
    getAuditLog: (limit = 50) => request<any[]>(`/admin/audit-log?limit=${limit}`),
    getSystemHealth: () => request<any>('/admin/health'),
  },
  team: {
    list:   ()                                    => request<any[]>('/team/members'),
    invite: (email: string, role: string)         => request<any>('/team/invite',          { method: 'POST', body: JSON.stringify({ email, role }) }),
    remove: (userId: string)                      => request<{ success: boolean }>(`/team/members/${userId}`, { method: 'DELETE' }),
    update: (userId: string, role: string)        => request<any>(`/team/members/${userId}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
    getInvites: ()                                => request<any[]>('/team/invites'),
    cancelInvite: (inviteId: string)              => request<{ success: boolean }>(`/team/invites/${inviteId}`, { method: 'DELETE' }),
  },
  settings: {
    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      request<{ success: boolean }>('/settings/change-password', { method: 'POST', body: JSON.stringify(data) }),
    getAiProviderKeys: () => request<any[]>('/settings/ai-provider-keys'),
    updateAiProviderKeys: (data: Record<string, string>) =>
      request<{ success: boolean }>('/settings/ai-provider-keys', { method: 'PUT', body: JSON.stringify(data) }),
    listApiKeys: () => request<any[]>('/settings/api-keys'),
    createApiKey: (name: string) =>
      request<any>('/settings/api-keys', { method: 'POST', body: JSON.stringify({ name }) }),
    deleteApiKey: (id: string) =>
      request<{ success: boolean }>(`/settings/api-keys/${id}`, { method: 'DELETE' }),
    getApiKeyUsage: (id: string) => request<{ calls: number; quota: number; resetAt: string | null }>(`/settings/api-keys/${id}/usage`),
  },
};

export function saveAuth(data: any) {
  const token = data.accessToken || data.access_token;
  if (token) localStorage.setItem('bs_access_token', token);
  if (data.refreshToken || data.refresh_token) localStorage.setItem('bs_refresh_token', data.refreshToken || data.refresh_token);
  if (data.user) localStorage.setItem('bs_user', JSON.stringify(data.user));
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('bs_user');
  return raw ? JSON.parse(raw) : null;
}

export function clearAuth() {
  localStorage.removeItem('bs_access_token');
  localStorage.removeItem('bs_refresh_token');
  localStorage.removeItem('bs_user');
}

export function isPro(): boolean {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem('bs_access_token');
  if (!token) return false;
  const user = getUser();
  return user?.plan === 'pro' || user?.role === 'admin';
}

export function isAdmin(): boolean {
  if (typeof window === 'undefined') return false;
  const user = getUser();
  return user?.role === 'admin' || user?.email === 'sellbodr@gmail.com';
}
