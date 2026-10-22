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
    return postgresStore(pool, { schema: env.PG_SCHEMA || "app" });
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
const api = createApp({
  DB: store,
  AI: createAI(env),
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
    res.writeHead(r.status, out); res.end(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    console.error("http_error", e && e.message);
    if (!res.headersSent) res.writeHead(500, { "content-type": "application/json" }); res.end('{"error":"server_error"}');
  }
});

const port = Number(env.PORT || 8080), host = env.HOST || "0.0.0.0";
server.listen(port, host, () => console.log(`Répétition prêt sur http://${host}:${port} · base ${store.name} · IA ${env.AI_PROVIDER || "auto"}`));
const stop = () => server.close(async () => { await store.close?.(); process.exit(0); });
process.on("SIGTERM", stop); process.on("SIGINT", stop);
