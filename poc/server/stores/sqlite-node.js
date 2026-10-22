/** SQLite embarqué de Node.js (node:sqlite, Node 22.5+). Idéal pour un serveur unique, une VM ou un conteneur avec volume. */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export function sqliteStore(path) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  const norm = (v) => (v === undefined ? null : typeof v === "boolean" ? (v ? 1 : 0) : v);
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a.map(norm)),
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; },
    _exec: () => {
      const p = db.prepare(sql);
      if (/^\s*(select|with)\b/i.test(sql)) return { results: p.all(...args), meta: { changes: 0 } };
      const r = p.run(...args); return { results: [], meta: { changes: Number(r.changes) } };
    },
  });
  return {
    name: "sqlite",
    dialect: "sqlite",
    prepare: (sql) => stmt(sql),
    async batch(stmts) {
      db.exec("BEGIN");
      try { const out = stmts.map((s) => s._exec()); db.exec("COMMIT"); return out; }
      catch (e) { db.exec("ROLLBACK"); throw e; }
    },
    async ensureSchema(ddl) { db.exec("BEGIN"); try { ddl.forEach((s) => db.exec(s)); db.exec("COMMIT"); } catch (e) { db.exec("ROLLBACK"); throw e; } },
    close: () => db.close(),
  };
}
