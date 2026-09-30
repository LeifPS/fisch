// Fischerdock v3 – Cloudflare Worker + Durable Object
// Serves the game (static assets) and runs accounts, multiplayer (WebSocket), global world state, leaderboard and cloud saves.

const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
const rnd = n => { const a = new Uint8Array(n); crypto.getRandomValues(a); return hex(a); };
const sha = async s => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
const num = (v, max = 1e15) => (typeof v === "number" && isFinite(v) ? Math.max(0, Math.min(max, v)) : 0);
const str = (v, n) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, n) : "");

const PBKDF2_ITER = 12000;
async function hashPass(pass, salt) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: PBKDF2_ITER }, key, 256);
  return hex(bits);
}
const NAME_RE = /^[A-Za-z0-9ÄÖÜäöüß_\-]{3,16}$/;
const ADMIN_NAME = "leif";
const ADMIN_CODE = "8283";

// global world state defaults (admin overrides, shared by everyone)
const GW0 = { off: 0, weather: null, aurora: null, season: null, event: null, evUntil: 0, aw: null, awUntil: 0, v: 0 };

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
    this.sql.exec(`CREATE TABLE IF NOT EXISTS accounts (lc TEXT PRIMARY KEY, name TEXT NOT NULL, id TEXT NOT NULL UNIQUE, salt TEXT NOT NULL, hash TEXT NOT NULL, admin INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL);
                   CREATE TABLE IF NOT EXISTS sessions (th TEXT PRIMARY KEY, id TEXT NOT NULL, t INTEGER NOT NULL);
                   CREATE TABLE IF NOT EXISTS board3 (id TEXT PRIMARY KEY, d TEXT NOT NULL, earned REAL NOT NULL);
                   CREATE TABLE IF NOT EXISTS saves3 (id TEXT PRIMARY KEY, d TEXT NOT NULL, t INTEGER NOT NULL);
                   CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL);`);
    const row = this.sql.exec("SELECT v FROM kv WHERE k='gw'").toArray()[0];
    this.gw = row ? { ...GW0, ...JSON.parse(row.v) } : { ...GW0 };
  }

  saveGW() { this.gw.v = (this.gw.v || 0) + 1; this.sql.exec("INSERT INTO kv (k,v) VALUES ('gw',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v", JSON.stringify(this.gw)); }
  liveGW() {
    const now = Date.now(), g = { ...this.gw };
    if (g.aw && g.awUntil < now) { g.aw = null; g.awUntil = 0; }
    if (g.event && g.evUntil && g.evUntil < now) { g.event = null; g.evUntil = 0; }
    return g;
  }

  account(id) { return this.sql.exec("SELECT name, id, admin FROM accounts WHERE id = ?", id).toArray()[0] || null; }
  async sessionOf(token) {
    if (typeof token !== "string" || token.length < 20 || token.length > 100) return null;
    const s = this.sql.exec("SELECT id FROM sessions WHERE th = ?", await sha(token)).toArray()[0];
    return s ? this.account(s.id) : null;
  }
  async userFromReq(req) {
    const h = req.headers.get("authorization") || "";
    return this.sessionOf(h.startsWith("Bearer ") ? h.slice(7) : "");
  }
  async newSession(id) {
    const token = rnd(24);
    this.sql.exec("INSERT INTO sessions (th, id, t) VALUES (?, ?, ?)", await sha(token), id, Date.now());
    return token;
  }

  async fetch(req) {
    const url = new URL(req.url), P = url.pathname;
    if (P === "/ws") {
      if (req.headers.get("Upgrade") !== "websocket") return new Response("Expected WebSocket", { status: 426 });
      const { 0: client, 1: server } = new WebSocketPair();
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment({ peer: null });
      return new Response(null, { status: 101, webSocket: client });
    }

    if (P === "/api/gw" && req.method === "GET") return json({ gw: this.liveGW(), now: Date.now() });

    if ((P === "/api/register" || P === "/api/login") && req.method === "POST") {
      let b; try { b = await req.json(); } catch { return json({ error: "Ungültige Anfrage." }, 400); }
      const name = str(b.name, 32).trim(), pass = typeof b.pass === "string" ? b.pass : "";
      if (!NAME_RE.test(name)) return json({ error: "Name: 3–16 Zeichen, nur Buchstaben, Zahlen, _ und -." }, 400);
      if (pass.length < 4 || pass.length > 72) return json({ error: "Passwort: mindestens 4 Zeichen." }, 400);
      const lc = name.toLowerCase();
      const acc = this.sql.exec("SELECT * FROM accounts WHERE lc = ?", lc).toArray()[0];
      if (P === "/api/register") {
        if (acc) return json({ error: `Der Name „${acc.name}“ ist schon vergeben. Jeder Name existiert nur einmal.` }, 409);
        const salt = rnd(12), id = rnd(8);
        this.sql.exec("INSERT INTO accounts (lc, name, id, salt, hash, admin, created) VALUES (?, ?, ?, ?, ?, 0, ?)", lc, name, id, salt, await hashPass(pass, salt), Date.now());
        return json({ token: await this.newSession(id), id, name, admin: false });
      }
      if (!acc || (await hashPass(pass, acc.salt)) !== acc.hash) return json({ error: "Name oder Passwort falsch." }, 401);
      return json({ token: await this.newSession(acc.id), id: acc.id, name: acc.name, admin: !!acc.admin });
    }

    if (P === "/api/board" && req.method === "GET") {
      const rows = this.sql.exec("SELECT b.id, b.d, a.name FROM board3 b JOIN accounts a ON a.id = b.id WHERE a.admin = 0 ORDER BY b.earned DESC LIMIT 50").toArray();
      return json(rows.map(r => ({ id: r.id, d: { ...JSON.parse(r.d), nick: r.name } })));
    }

    const me = await this.userFromReq(req);
    if (!me) return json({ error: "unauthorized" }, 401);

    if (P === "/api/me") return json({ id: me.id, name: me.name, admin: !!me.admin });

    if (P === "/api/logout" && req.method === "POST") {
      const h = req.headers.get("authorization") || "";
      this.sql.exec("DELETE FROM sessions WHERE th = ?", await sha(h.slice(7)));
      return new Response(null, { status: 204 });
    }

    if (P === "/api/board" && req.method === "PUT") {
      let b; try { b = await req.json(); } catch { return json({ error: "bad json" }, 400); }
      const d = {
        earned: num(b.earned), caught: num(b.caught), bestV: num(b.bestV), bestN: str(b.bestN, 60),
        dex: num(b.dex, 10000), lvl: num(b.lvl, 1000), t: Date.now(), title: str(b.title, 30), qr: num(b.qr, 8),
      };
      if (!d.caught || me.admin) return new Response(null, { status: 204 });
      this.sql.exec("INSERT INTO board3 (id, d, earned) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET d = excluded.d, earned = excluded.earned", me.id, JSON.stringify(d), d.earned);
      this.broadcast({ t: "board" });
      return new Response(null, { status: 204 });
    }

    if (P === "/api/save" && req.method === "GET") {
      const row = this.sql.exec("SELECT d FROM saves3 WHERE id = ?", me.id).toArray()[0];
      return json(row ? JSON.parse(row.d) : null);
    }

    if (P === "/api/save" && req.method === "PUT") {
      const text = await req.text();
      if (text.length > 600000) return json({ error: "too large" }, 413);
      let b; try { b = JSON.parse(text); } catch { return json({ error: "bad json" }, 400); }
      if (typeof b.json !== "string") return json({ error: "bad save" }, 400);
      this.sql.exec("INSERT INTO saves3 (id, d, t) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET d = excluded.d, t = excluded.t", me.id, JSON.stringify({ json: b.json, savedAt: num(b.savedAt) }), Date.now());
      return new Response(null, { status: 204 });
    }

    return json({ error: "not found" }, 404);
  }

  // ---- WebSocket (hibernation API) ----
  async webSocketMessage(ws, msg) {
    if (typeof msg !== "string" || msg.length > 4000) return;
    let m; try { m = JSON.parse(msg); } catch { return; }
    const a = ws.deserializeAttachment() || {};

    if (m.t === "auth") {
      if (a.peer) return;
      const acc = await this.sessionOf(m.token);
      if (!acc) { ws.send(JSON.stringify({ t: "denied" })); ws.close(4001, "unauthorized"); return; }
      // one live connection per account: kick older ones
      for (const o of this.authed()) if (o.a.by === acc.id) { try { o.ws.send(JSON.stringify({ t: "kicked" })); o.ws.close(4002, "elsewhere"); } catch {} this.left(o.ws); }
      const peer = rnd(6);
      ws.serializeAttachment({ peer, by: acc.id, name: acc.name, adm: !!acc.admin, p: {}, n: 0, w: Date.now() });
      const peers = this.authed().filter(o => o.ws !== ws).map(o => ({ peer: o.a.peer, by: o.a.by, name: o.a.name, p: o.a.p }));
      ws.send(JSON.stringify({ t: "hello", you: peer, name: acc.name, admin: !!acc.admin, peers, gw: this.liveGW(), now: Date.now() }));
      this.broadcast({ t: "j", peer, by: acc.id, name: acc.name, p: {} }, ws);
      return;
    }
    if (!a.peer) return;

    if (m.t === "p") {
      const now = Date.now();
      if (now - a.w > 1000) { a.w = now; a.n = 0; }
      if (++a.n > 25) return; // rate limit
      const p = m.p && typeof m.p === "object" ? m.p : {};
      if (JSON.stringify(p).length > 1500) return; // attachment limit is 2 KB
      a.p = p;
      ws.serializeAttachment(a);
      this.broadcast({ t: "u", peer: a.peer, p }, ws);
      return;
    }

    if (m.t === "unlock") { // "/admin code:8283" – only for the account named leif
      const ok = String(a.name || "").toLowerCase() === ADMIN_NAME && String(m.code || "").trim() === ADMIN_CODE;
      if (ok) {
        this.sql.exec("UPDATE accounts SET admin = 1 WHERE id = ?", a.by);
        this.sql.exec("DELETE FROM board3 WHERE id = ?", a.by);
        a.adm = true; ws.serializeAttachment(a);
      }
      ws.send(JSON.stringify({ t: "adm", ok }));
      return;
    }
    if (m.t === "unadmin" && a.adm) {
      this.sql.exec("UPDATE accounts SET admin = 0 WHERE id = ?", a.by);
      a.adm = false; ws.serializeAttachment(a); ws.send(JSON.stringify({ t: "adm", ok: false }));
      return;
    }

    if (m.t === "gw" && a.adm) { // global world overrides – everyone sees the same world
      const q = m.patch && typeof m.patch === "object" ? m.patch : {};
      const g = this.gw, now = Date.now();
      if ("off" in q) g.off = typeof q.off === "number" && isFinite(q.off) ? q.off : 0;
      if ("weather" in q) g.weather = ["Clear", "Rain", "Foggy", "Windy"].includes(q.weather) ? q.weather : null;
      if ("aurora" in q) g.aurora = typeof q.aurora === "boolean" ? q.aurora : null;
      if ("season" in q) g.season = ["Spring", "Summer", "Autumn", "Winter"].includes(q.season) ? q.season : null;
      if ("event" in q) { g.event = typeof q.event === "string" ? str(q.event, 40) : q.event === false ? false : null; g.evUntil = g.event ? now + 10 * 60e3 : 0; }
      if ("aw" in q) { g.aw = ["blood", "star", "storm"].includes(q.aw) ? q.aw : null; g.awUntil = g.aw ? now + Math.min(10 * 60e3, num(q.dur, 600) * 1000 || 120e3) : 0; }
      if (q.reset) Object.assign(g, GW0, { v: g.v });
      this.saveGW();
      this.broadcast({ t: "gw", gw: this.liveGW(), now, by: a.name });
      return;
    }

    if (m.t === "sys" && a.adm) { this.broadcast({ t: "sys", text: str(m.text, 140), by: a.name }); return; }
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
