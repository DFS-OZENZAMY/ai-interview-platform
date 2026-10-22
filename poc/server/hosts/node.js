#!/usr/bin/env node
/**
 * Hôte Node.js universel : VPS, conteneur Docker, Render, Railway, Fly.io, Koyeb, Azure App Service,
 * AWS (EC2/ECS/App Runner), Google Cloud Run, Scaleway, OVH, serveur sur site…
 * Sert l'interface statique et l'API, avec SQLite (par défaut) ou PostgreSQL (DATABASE_URL).
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, normalize, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "../core/app.js";
import { createAI } from "../ai/index.js";
import { createQuestionSource } from "../questions/index.js";
import { createSttProvider, openSttSession } from "../stt/index.js";
import { createTtsProvider } from "../tts/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const env = process.env;
const PUBLIC_DIR = env.PUBLIC_DIR || join(here, "../../public");
const MAX_BODY = 256 * 1024;

async function makeStore() {
  const kind = (env.STORE || (env.DATABASE_URL ? "postgres" : "sqlite")).toLowerCase();
  if (kind === "postgres") {
    if (!env.DATABASE_URL) throw new Error("DATABASE_URL requis pour STORE=postgres");
    const { default: pg } = await import("pg").catch(() => { throw new Error("Installez le pilote : npm install pg"); });
    const ssl = env.PG_SSL === "disable" ? false : env.PG_SSL === "require" || /supabase|neon|azure|rds|sslmode=require/.test(env.DATABASE_URL) ? { rejectUnauthorized: env.PG_SSL_STRICT === "true" } : false;
    const pool = new pg.Pool({ connectionString: env.DATABASE_URL, ssl, max: Number(env.PG_POOL_MAX || 5) });
    const { postgresStore } = await import("../stores/postgres.js");
    const store = postgresStore(pool, { schema: env.PG_SCHEMA || "app" });
    store.pool = pool;
    return store;
  }
  const { sqliteStore } = await import("../stores/sqlite-node.js");
  return sqliteStore(env.SQLITE_PATH || join(here, "../../data/app.db"));
}

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".webp": "image/webp", ".txt": "text/plain; charset=utf-8" };
const SEC = { "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin", "x-frame-options": "DENY", "permissions-policy": "camera=(self), microphone=(self), geolocation=()" };

async function serveStatic(pathname, res) {
  let rel = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, "");
  if (rel.includes("..")) { res.writeHead(400, SEC).end(); return; }
  let file = join(PUBLIC_DIR, rel || "index.html");
  try { if ((await stat(file)).isDirectory()) file = join(file, "index.html"); }
  catch { if (!extname(rel)) file = join(PUBLIC_DIR, "index.html"); }   // routes de l'application → index.html
  try {
    const body = await readFile(file);
    res.writeHead(200, { ...SEC, "content-type": TYPES[extname(file)] || "application/octet-stream", "cache-control": extname(file) === ".html" ? "no-cache" : "public, max-age=3600" });
    res.end(body);
  } catch { res.writeHead(404, { ...SEC, "content-type": "text/plain; charset=utf-8" }).end("Introuvable"); }
}

function originOf(req) {
  if (env.PUBLIC_URL) return new URL(env.PUBLIC_URL).origin;
  const proto = env.TRUST_PROXY === "true" ? (req.headers["x-forwarded-proto"] || "http").split(",")[0].trim() : (req.socket.encrypted ? "https" : "http");
  const host = env.TRUST_PROXY === "true" ? (req.headers["x-forwarded-host"] || req.headers.host) : req.headers.host;
  return `${proto}://${host || "localhost"}`;
}

const store = await makeStore();
const questions = await createQuestionSource(env, { pgPool: store.pool });
const stt = createSttProvider(env);
const api = createApp({
  DB: store,
  AI: createAI(env),
  QUESTIONS: questions,
  STT: stt,
  TTS: createTtsProvider(env),
  COACH_INVITE_CODE: env.COACH_INVITE_CODE,
  COOKIE_SECURE: env.COOKIE_SECURE ? env.COOKIE_SECURE !== "false" : !!(env.PUBLIC_URL || "").startsWith("https"),
  RUNTIME: env.RUNTIME_LABEL || "node",
});

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, originOf(req));
    if (!url.pathname.startsWith("/api/")) {
      if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, SEC).end(); return; }
      return serveStatic(url.pathname, res);
    }
    const chunks = []; let size = 0;
    for await (const c of req) { size += c.length; if (size > MAX_BODY) { res.writeHead(413, { ...SEC, "content-type": "application/json" }).end('{"error":"too_large"}'); return; } chunks.push(c); }
    const headers = new Headers(); for (const [k, v] of Object.entries(req.headers)) if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(", ") : v);
    const r = await api(new Request(url, { method: req.method, headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks) }));
    const out = { ...SEC }; r.headers.forEach((v, k) => { out[k] = v; });
    res.writeHead(r.status, out);
    if (!r.body) return res.end();
    const reader = r.body.getReader();                 // streaming (voix de Lina : lecture pendant la génération)
    req.on("close", () => reader.cancel().catch(() => {}));
    for (;;) { const { done, value } = await reader.read(); if (done) break; if (!res.write(value)) await new Promise((ok) => res.once("drain", ok)); }
    res.end();
  } catch (e) {
    console.error("http_error", e && e.message);
    if (!res.headersSent) res.writeHead(500, { "content-type": "application/json" }); res.end('{"error":"server_error"}');
  }
});

/* Transcription vocale en continu : WebSocket /api/stt/stream relayé vers Kyutai (clé côté serveur). */
if (stt) {
  const { WebSocketServer, WebSocket } = await import("ws").catch(() => { throw new Error("Installez le module : npm install ws"); });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
  const active = new Map();   // une seule dictée à la fois par utilisateur
  server.on("upgrade", async (req, socket, head) => {
    const deny = (code, msg) => { socket.write(`HTTP/1.1 ${code} ${msg}\r\nConnection: close\r\n\r\n`); socket.destroy(); };
    try {
      const url = new URL(req.url, originOf(req));
      if (url.pathname !== "/api/stt/stream") return deny(404, "Not Found");
      if (req.headers.origin && req.headers.origin !== url.origin) return deny(403, "Forbidden");
      const headers = new Headers(); for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
      const user = await api.authenticate(new Request(url, { headers }));
      if (!user || user.role !== "candidate") return deny(401, "Unauthorized");
      if (active.has(user.id)) { try { active.get(user.id).close(); } catch {} }
      wss.handleUpgrade(req, socket, head, async (client) => {
        let session = null;
        const pending = [];
        client.on("message", (data, isBinary) => { if (!session) return pending.push([data, isBinary]); isBinary ? session.onClientBinary(data) : session.onClientText(data.toString()); });
        client.on("close", () => { active.delete(user.id); session && session.close(); });
        try {
          session = await openSttSession({
            provider: stt,
            connectUpstream: (u, h) => new Promise((resolve, reject) => {
              const ws = new WebSocket(u, { headers: h, handshakeTimeout: 8000 });
              ws.binaryType = "nodebuffer";
              const queue = []; let onMsg = null;
              ws.on("message", (d) => { const u = new Uint8Array(d); onMsg ? onMsg(u) : queue.push(u); });   // aucune perte avant l'attache de l'écouteur
              ws.once("open", () => resolve({ send: (d) => ws.readyState === 1 && ws.send(d), close: () => ws.close(), onMessage: (cb) => { onMsg = cb; queue.splice(0).forEach(cb); }, onClose: (cb) => ws.on("close", cb) }));
              ws.once("error", reject);
            }),
            sendToClient: (m) => client.readyState === 1 && client.send(JSON.stringify(m)),
            closeClient: () => client.close(),
            log: (...a) => console.log(...a),
          });
          active.set(user.id, client);
          for (const [d, b] of pending) b ? session.onClientBinary(d) : session.onClientText(d.toString());
        } catch (e) {
          console.error("stt_upstream_error", e && e.message);
          client.send(JSON.stringify({ type: "error", message: "Service de transcription indisponible." })); client.close();
        }
      });
    } catch (e) { console.error("stt_upgrade_error", e && e.message); deny(500, "Error"); }
  });
}

const port = Number(env.PORT || 8080), host = env.HOST || "0.0.0.0";
server.listen(port, host, () => console.log(`Répétition prêt sur http://${host}:${port} · base ${store.name} · IA ${env.AI_PROVIDER || "auto"} · questions ${questions ? questions.name : "builtin"} · STT ${stt ? stt.name : "browser"} · voix ${env.TTS_PROVIDER || "browser"}`));
const stop = () => server.close(async () => { await store.close?.(); process.exit(0); });
process.on("SIGTERM", stop); process.on("SIGINT", stop);
