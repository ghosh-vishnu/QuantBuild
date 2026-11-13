import { socketUrl } from '../../lib/config';
import { useEffect, useRef, useState } from 'react';
import { refreshAccess, sessionStore, type Row } from '../../lib/api';
export function useChatSocket(
  projectId: number,
  groupId: number | undefined,
  onEvent: (event: Row) => void,
) {
  const [status, setStatus] = useState('Connecting');
  const socket = useRef<WebSocket | null>(null);
  const callback = useRef(onEvent);
  callback.current = onEvent;
  const ready = useRef(false);
  useEffect(() => {
    if (!groupId) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    let retries = 0;
    let refreshed = false;
    const connect = () => {
      if (disposed) return;
      ready.current = false;
      setStatus(retries ? 'Reconnecting' : 'Connecting');
      const ws = new WebSocket(
        socketUrl(`/ws/projects/${projectId}/chat/groups/${groupId}/`),
      );
      socket.current = ws;
      ws.onmessage = (event) => {
        if (disposed) return;
        let data: Row;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        if (data.type === 'auth.required') {
          const access = sessionStore.get()?.access;
          if (access) ws.send(JSON.stringify({ type: 'auth', access }));
          else ws.close();
          return;
        }
        if (data.type === 'auth.ok') {
          ready.current = true;
          setStatus('Live');
          retries = 0;
          refreshed = false;
          return;
        }
        callback.current(data);
      };
      ws.onerror = () => {
        if (!disposed) setStatus('Connection interrupted');
      };
      ws.onclose = async (event) => {
        if (disposed) return;
        ready.current = false;
        if ([4401, 4403].includes(event.code)) {
          if (!refreshed) {
            refreshed = true;
            const token = await refreshAccess();
            if (token && !disposed) {
              connect();
              return;
            }
          }
          setStatus('Access unavailable');
          callback.current({ type: 'access.denied' });
          return;
        }
        setStatus('Reconnecting');
        timer = setTimeout(connect, Math.min(1000 * 2 ** retries++, 30000));
      };
    };
    connect();
    return () => {
      disposed = true;
      clearTimeout(timer);
      ready.current = false;
      socket.current?.close();
    };
  }, [projectId, groupId]);
  const send = (data: Row) => {
    if (!ready.current || socket.current?.readyState !== WebSocket.OPEN) return false;
    socket.current.send(JSON.stringify(data));
    return true;
  };
  return { status, send };
}
