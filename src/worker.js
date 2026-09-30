// Fischerdock – Cloudflare Worker + Durable Object
// Serves the game (static assets) and runs multiplayer (WebSocket), leaderboard and cloud saves.

const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
async function idOf(token) {
  if (typeof token !== "string" || token.length < 20 || token.length > 100) return null;
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))).slice(0, 16);
}
async function idFromReq(req) {
  const h = req.headers.get("authorization") || "";
  return idOf(h.startsWith("Bearer ") ? h.slice(7) : "");
}
const num = (v, max = 1e15) => (typeof v === "number" && isFinite(v) ? Math.max(0, Math.min(max, v)) : 0);
const str = (v, n) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, "").slice(0, n) : "");

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/ws" || url.pathname.startsWith("/api/")) {
      const room = env.ROOM.get(env.ROOM.idFromName("main"));
      return room.fetch(req);
    }
    return env.ASSETS.fetch(req);
  },
};

export class GameRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS board (id TEXT PRIMARY KEY, d TEXT NOT NULL, earned REAL NOT NULL);
                   CREATE TABLE IF NOT EXISTS saves (id TEXT PRIMARY KEY, d TEXT NOT NULL, t INTEGER NOT NULL);`);
  }

  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/ws") {
      if (req.headers.get("Upgrade") !== "websocket") return new Response("Expected WebSocket", { status: 426 });
      const { 0: client, 1: server } = new WebSocketPair();
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment({ peer: null });
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === "/api/board" && req.method === "GET") {
      const rows = this.sql.exec("SELECT id, d FROM board ORDER BY earned DESC LIMIT 50").toArray();
      return json(rows.map(r => ({ id: r.id, d: JSON.parse(r.d) })));
    }

    const id = await idFromReq(req);
    if (!id) return json({ error: "unauthorized" }, 401);

    if (url.pathname === "/api/board" && req.method === "PUT") {
      let b; try { b = await req.json(); } catch { return json({ error: "bad json" }, 400); }
      const d = {
        earned: num(b.earned), caught: num(b.caught), bestV: num(b.bestV), bestN: str(b.bestN, 60),
        dex: num(b.dex, 10000), lvl: num(b.lvl, 1000), t: Date.now(), nick: str(b.nick, 20), title: str(b.title, 30), qr: num(b.qr, 4),
      };
      if (!d.caught) return new Response(null, { status: 204 }); // nobody on the board before their first fish
      this.sql.exec("INSERT INTO board (id, d, earned) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET d = excluded.d, earned = excluded.earned", id, JSON.stringify(d), d.earned);
      this.broadcast({ t: "board" });
      return new Response(null, { status: 204 });
    }

    if (url.pathname === "/api/save" && req.method === "GET") {
      const row = this.sql.exec("SELECT d FROM saves WHERE id = ?", id).toArray()[0];
      return json(row ? JSON.parse(row.d) : null);
    }

    if (url.pathname === "/api/save" && req.method === "PUT") {
      const text = await req.text();
      if (text.length > 400000) return json({ error: "too large" }, 413);
      let b; try { b = JSON.parse(text); } catch { return json({ error: "bad json" }, 400); }
      if (typeof b.json !== "string") return json({ error: "bad save" }, 400);
      this.sql.exec("INSERT INTO saves (id, d, t) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET d = excluded.d, t = excluded.t", id, JSON.stringify({ json: b.json, savedAt: num(b.savedAt) }), Date.now());
      return new Response(null, { status: 204 });
    }

    return json({ error: "not found" }, 404);
  }

  // ---- WebSocket (hibernation API): presence relay ----
  async webSocketMessage(ws, msg) {
    if (typeof msg !== "string" || msg.length > 4000) return;
    let m; try { m = JSON.parse(msg); } catch { return; }
    const a = ws.deserializeAttachment() || {};

    if (m.t === "auth") {
      if (a.peer) return;
      const by = await idOf(m.token);
      if (!by) { ws.close(4001, "unauthorized"); return; }
      const peer = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
      ws.serializeAttachment({ peer, by, p: {}, n: 0, w: Date.now() });
      const peers = this.authed().filter(o => o.ws !== ws).map(o => ({ peer: o.a.peer, by: o.a.by, p: o.a.p }));
      ws.send(JSON.stringify({ t: "hello", you: peer, peers }));
      this.broadcast({ t: "j", peer, by, p: {} }, ws);
      return;
    }

    if (m.t === "p" && a.peer) {
      const now = Date.now();
      if (now - a.w > 1000) { a.w = now; a.n = 0; }
      if (++a.n > 25) return; // rate limit
      const p = m.p && typeof m.p === "object" ? m.p : {};
      if (JSON.stringify(p).length > 1500) return; // attachment limit is 2 KB
      a.p = p;
      ws.serializeAttachment(a);
      this.broadcast({ t: "u", peer: a.peer, p }, ws);
    }
  }

  webSocketClose(ws, code) { this.left(ws); try { ws.close(code === 1005 ? 1000 : code, "bye"); } catch {} }
  webSocketError(ws) { this.left(ws); }

  left(ws) {
    const a = ws.deserializeAttachment();
    if (a && a.peer && !a.gone) { a.gone = true; ws.serializeAttachment(a); this.broadcast({ t: "l", peer: a.peer }, ws); }
  }

  authed() {
    return this.ctx.getWebSockets().map(ws => ({ ws, a: ws.deserializeAttachment() || {} })).filter(o => o.a.peer && !o.a.gone);
  }

  broadcast(msg, except) {
    const s = JSON.stringify(msg);
    for (const { ws } of this.authed()) if (ws !== except) { try { ws.send(s); } catch {} }
  }
}
