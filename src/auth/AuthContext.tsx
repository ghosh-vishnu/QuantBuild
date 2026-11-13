import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, sessionStore, type Session } from '../lib/api';
const Auth = createContext<{
  session: Session | null;
  finishLogin: (data: any) => void;
  logout: () => Promise<void>;
}>({ session: null, finishLogin: () => {}, logout: async () => {} });
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(sessionStore.get);
  const client = useQueryClient();
  useEffect(() => {
    const sync = () => setSession(sessionStore.get());
    window.addEventListener('session.changed', sync);
    return () => window.removeEventListener('session.changed', sync);
  }, []);
  const finishLogin = (data: any) => {
    client.clear();
    sessionStore.set({ ...data.tokens, user: data.user });
  };
  const logout = async () => {
    const current = sessionStore.get();
    try {
      if (current)
        await api('/api/accounts/logout/', 'POST', {
          refresh: current.refresh,
        });
    } catch {
      // Clear this browser session even if the server is temporarily unavailable.
    } finally {
      sessionStore.clear();
      client.clear();
    }
  };
  return <Auth.Provider value={{ session, finishLogin, logout }}>{children}</Auth.Provider>;
}
export const useAuth = () => useContext(Auth);
