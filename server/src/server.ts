import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import type { ServerMessage, ShrineState, Trade } from './protocol.js';

export interface AppContext {
  hello(): ServerMessage;
  trades(limit: number): Trade[];
  holders(limit: number): { address: string; balance: string }[];
  health(): Record<string, unknown>;
  reset(): ShrineState;
  /** injects a synthetic trade (admin only): for demos, videos and testing */
  inject(side: 'buy' | 'sell', usd: number): ShrineState;
  adminToken?: string;
  corsOrigin: string;
}

interface LiveSocket extends WebSocket {
  isAlive?: boolean;
}

export function createServer(ctx: AppContext) {
  const wss = new WebSocketServer({ noServer: true });

  const json = (res: http.ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': ctx.corsOrigin,
      'access-control-allow-headers': 'authorization, content-type',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'cache-control': 'no-store',
    });
    res.end(JSON.stringify(body));
  };

  const admin = (req: http.IncomingMessage, res: http.ServerResponse): boolean => {
    if (!ctx.adminToken) {
      json(res, 404, { error: 'admin disabled' });
      return false;
    }
    if ((req.headers.authorization ?? '') !== `Bearer ${ctx.adminToken}`) {
      json(res, 401, { error: 'unauthorized' });
      return false;
    }
    return true;
  };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (req.method === 'OPTIONS') return json(res, 204, {});
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) return json(res, 200, ctx.health());
    if (req.method === 'GET' && url.pathname === '/api/state') return json(res, 200, ctx.hello());
    if (req.method === 'GET' && url.pathname === '/api/trades') {
      const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit') ?? 50) || 50));
      return json(res, 200, { trades: ctx.trades(limit) });
    }
    if (req.method === 'GET' && url.pathname === '/api/holders') {
      const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') ?? 10) || 10));
      return json(res, 200, { holders: ctx.holders(limit) });
    }
    if (req.method === 'POST' && url.pathname === '/admin/reset') {
      if (!admin(req, res)) return;
      const state = ctx.reset();
      broadcast({ type: 'state', state });
      return json(res, 200, { ok: true, state });
    }
    if (req.method === 'POST' && url.pathname === '/admin/trade') {
      if (!admin(req, res)) return;
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 4096) req.destroy();
      });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}') as { side?: string; usd?: number };
          const side = parsed.side === 'sell' ? 'sell' : 'buy';
          const usd = Number(parsed.usd);
          if (!Number.isFinite(usd) || usd <= 0) return json(res, 400, { error: 'usd must be a positive number' });
          return json(res, 200, { ok: true, state: ctx.inject(side, usd) });
        } catch (err) {
          return json(res, 400, { error: (err as Error).message });
        }
      });
      return;
    }
    return json(res, 404, { error: 'not found' });
  });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname !== '/ws' && url.pathname !== '/') {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  wss.on('connection', (ws: LiveSocket) => {
    ws.isAlive = true;
    ws.on('pong', () => (ws.isAlive = true));
    ws.on('error', () => ws.terminate());
    ws.send(JSON.stringify(ctx.hello()));
  });

  const heartbeat = setInterval(() => {
    for (const client of wss.clients as Set<LiveSocket>) {
      if (client.isAlive === false) {
        client.terminate();
        continue;
      }
      client.isAlive = false;
      client.ping();
    }
  }, 30000);

  function broadcast(msg: ServerMessage) {
    const data = JSON.stringify(msg);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(data);
    }
  }

  function close() {
    clearInterval(heartbeat);
    for (const client of wss.clients) client.close(1001, 'server shutting down');
    wss.close();
    server.close();
  }

  return { server, wss, broadcast, close, clientCount: () => wss.clients.size };
}
