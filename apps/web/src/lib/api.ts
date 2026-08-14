const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('bs_access_token');
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('bs_access_token');
    // Only redirect to /login when on a protected page, not on auth pages themselves
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      if (!p.includes('/login') && !p.includes('/register')) {
        window.location.href = '/login';
      }
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
  },
  billing: {
    getSubscription: () => request<any>('/billing/subscription'),
    getPlans: () => request<any[]>('/billing/plans'),
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
