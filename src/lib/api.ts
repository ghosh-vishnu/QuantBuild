import { apiUrl, config } from './config';
export type Row = Record<string, any>;
export type Session = {
  access: string;
  refresh: string;
  user: { id: number; email: string; name: string; role: string };
};
const KEY = 'quantibuild.session';
export const sessionStore = {
  get(): Session | null {
    try {
      return JSON.parse(sessionStorage.getItem(KEY) || 'null');
    } catch {
      return null;
    }
  },
  set(session: Session) {
    sessionStorage.setItem(KEY, JSON.stringify(session));
    window.dispatchEvent(new Event('session.changed'));
  },
  clear() {
    sessionStorage.removeItem(KEY);
    window.dispatchEvent(new Event('session.changed'));
  },
};
export function explain(value: any, prefix = ''): string {
  if (typeof value === 'string') return `${prefix}${value}`;
  if (Array.isArray(value)) return value.map((v) => explain(v, prefix)).join(' ');
  if (value && typeof value === 'object')
    return Object.entries(value)
      .map(([k, v]) =>
        explain(
          v,
          ['detail', 'message', 'error', 'non_field_errors'].includes(k)
            ? ''
            : `${k.replaceAll('_', ' ')}: `,
        ),
      )
      .join(' ');
  return 'Something went wrong. Please try again.';
}
export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: any,
  ) {
    super(explain(detail));
  }
}
let refreshing: Promise<string | null> | null = null;
export async function refreshAccess(): Promise<string | null> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const session = sessionStore.get();
    if (!session) return null;
    try {
      const response = await fetch(apiUrl('/api/token/refresh/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: session.refresh }),
      });
      if (!response.ok) {
        if ([400, 401].includes(response.status)) sessionStore.clear();
        return null;
      }
      const data = await response.json();
      if (sessionStore.get()?.refresh !== session.refresh) return null;
      sessionStore.set({
        ...session,
        access: data.access,
        refresh: data.refresh || session.refresh,
      });
      return data.access;
    } catch {
      return null;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}
export async function response(
  path: string,
  method = 'GET',
  body?: unknown,
  authenticated = true,
  signal?: AbortSignal,
): Promise<Response> {
  if (!path.startsWith('/api/')) throw new Error('Only application API paths are allowed.');
  const send = (token?: string) =>
    fetch(apiUrl(path), {
      method,
      signal,
      headers: {
        ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    });
  let res = await send(authenticated ? sessionStore.get()?.access : undefined);
  if (res.status === 401 && authenticated && sessionStore.get()) {
    const access = await refreshAccess();
    if (access) res = await send(access);
  }
  if (!res.ok) {
    let data;
    try {
      data = await res.json();
    } catch {
      data = { message: `Request failed (${res.status}).` };
    }
    throw new ApiError(res.status, data);
  }
  return res;
}
export async function api<T = Row>(
  path: string,
  method = 'GET',
  body?: unknown,
  auth = true,
): Promise<T> {
  const res = await response(path, method, body, auth);
  return res.status === 204 ? ({} as T) : res.json();
}
export function rows(data: any): Row[] {
  return Array.isArray(data) ? data : data?.results || [];
}
export function params(values: Row) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([k, v]) => {
    if (v !== '' && v !== undefined && v !== null) query.set(k, String(v));
  });
  return query.toString();
}
export async function openDocument(url: string, name = 'document') {
  const path = new URL(url, window.location.origin).pathname;
  const res = await response(path);
  const object = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = object;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(object), 30000);
}
export const dates = (value: any) =>
  value ? new Intl.DateTimeFormat(config.locale, { dateStyle: 'medium' }).format(new Date(value)) : '—';
export const stamp = (value: any) =>
  value
    ? new Intl.DateTimeFormat(config.locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : '—';
export const title = (value: string = '') =>
  value
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (s) => s.toUpperCase());
export function notify(message: string, kind: 'success' | 'error' = 'success') {
  window.dispatchEvent(new CustomEvent('toast', { detail: { message, kind } }));
}

// Preserve server Decimal precision instead of rounding through JavaScript Number.
export function decimal(value: unknown): string {
  const raw = String(value ?? '');
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return raw || '0';
  const [whole, fraction = ''] = raw.split('.');
  const clean = fraction.replace(/0+$/, '');
  return new Intl.NumberFormat(config.locale).format(BigInt(whole)) + (clean ? '.' + clean : '');
}
