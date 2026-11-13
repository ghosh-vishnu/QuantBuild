import { decimal } from './api';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, explain, params, rows, sessionStore } from './api';
const data = new Map<string, string>();
beforeEach(() => {
  data.clear();
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => data.get(k) || null,
    setItem: (k: string, v: string) => data.set(k, v),
    removeItem: (k: string) => data.delete(k),
  });
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('fetch', vi.fn());
});
const session = {
  access: 'old',
  refresh: 'refresh',
  user: {
    id: 1,
    name: 'Student',
    role: 'STUDENT',
    email: 'student@example.com',
  },
};
describe('API transport', () => {
  it('preserves explicit zero/false filters and normalizes list responses', () => {
    expect(params({ limit: 0, enabled: false, empty: '', absent: null })).toBe(
      'limit=0&enabled=false',
    );
    expect(rows({ results: [{ id: 2 }] })).toEqual([{ id: 2 }]);
  });
  it('explains nested API validation errors', () => {
    expect(explain({ input_data: { height: ['A positive height is required.'] } })).toContain(
      'height: A positive',
    );
  });
  it('does not send stored credentials to public login', async () => {
    sessionStore.set(session);
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ challenge_id: 'id' }), { status: 200 }),
    );
    await api(
      '/api/accounts/login/',
      'POST',
      { email: 'user@example.com', password: 'test' },
      false,
    );
    expect((vi.mocked(fetch).mock.calls[0][1]?.headers as any).Authorization).toBeUndefined();
  });
  it('deduplicates concurrent refreshes and replays protected requests', async () => {
    sessionStore.set(session);
    let count = 0;
    vi.mocked(fetch).mockImplementation(async (path, options) => {
      if (path === '/api/token/refresh/') {
        count++;
        return new Response(JSON.stringify({ access: 'new' }), { status: 200 });
      }
      if ((options?.headers as any).Authorization === 'Bearer old')
        return new Response('{}', { status: 401 });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    const results = await Promise.all([api('/api/a/'), api('/api/b/')]);
    expect(count).toBe(1);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(sessionStore.get()?.access).toBe('new');
  });
  it('clears an invalid refresh session and returns the original 401', async () => {
    sessionStore.set(session);
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Expired' }), { status: 401 }),
    );
    await expect(api('/api/protected/')).rejects.toBeInstanceOf(ApiError);
    expect(sessionStore.get()).toBeNull();
  });
  it('rejects external URLs before attaching a token', async () => {
    sessionStore.set(session);
    await expect(api('https://example.com/api/a/')).rejects.toThrow('Only application API paths');
    expect(fetch).not.toHaveBeenCalled();
  });
});

it('keeps the exact decimal result returned by the calculation engine', () => {
  expect(decimal('123456789012.123456789012')).toBe('1,23,45,67,89,012.123456789012');
  expect(decimal('0.000000000001')).toBe('0.000000000001');
  expect(decimal('60.000000000000')).toBe('60');
});
