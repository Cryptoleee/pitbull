import type { ServerMessage } from './protocol';

export type ConnectionStatus = 'connecting' | 'online' | 'offline';

const DEFAULT_WS = (() => {
  const env = import.meta.env.VITE_WS_URL as string | undefined;
  if (env) return env;
  if (typeof window === 'undefined') return 'ws://localhost:8080/ws';
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return 'ws://localhost:8080/ws';
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/ws`;
})();

export const WS_URL = DEFAULT_WS;

export interface FloraSocketHandlers {
  onMessage(msg: ServerMessage): void;
  onStatus(status: ConnectionStatus): void;
}

/** WebSocket client with exponential-backoff reconnect. */
export function connect(handlers: FloraSocketHandlers, url = WS_URL): () => void {
  let ws: WebSocket | null = null;
  let closed = false;
  let attempt = 0;
  let timer: number | undefined;

  const open = () => {
    if (closed) return;
    handlers.onStatus(attempt === 0 ? 'connecting' : 'offline');
    ws = new WebSocket(url);
    ws.onopen = () => {
      attempt = 0;
      handlers.onStatus('online');
    };
    ws.onmessage = (ev) => {
      try {
        handlers.onMessage(JSON.parse(ev.data as string) as ServerMessage);
      } catch (err) {
        console.warn('bad message', err);
      }
    };
    ws.onclose = () => {
      if (closed) return;
      handlers.onStatus('offline');
      attempt++;
      const delay = Math.min(15000, 500 * 2 ** Math.min(attempt, 5)) * (0.8 + Math.random() * 0.4);
      timer = window.setTimeout(open, delay);
    };
    ws.onerror = () => ws?.close();
  };
  open();

  return () => {
    closed = true;
    if (timer) window.clearTimeout(timer);
    ws?.close();
  };
}
