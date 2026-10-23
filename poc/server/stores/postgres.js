/**
 * PostgreSQL : tout serveur Postgres 14+ (Supabase, Neon, RDS, Azure, Scaleway, OVH, Docker, sur site).
 * Les tables de l'application vivent dans un schéma dédié (par défaut `app`), séparé de `question_bank`
 * et de `public`. Sur Supabase, ce schéma n'est pas exposé à l'API REST ; RLS est activé sans politique
 * et les rôles `anon` / `authenticated` n'y ont aucun droit : seul le serveur (connexion directe) y accède.
 *
 * @param {{ query(text: string, params?: any[]): Promise<{rows:any[], rowCount:number}>, connect?: Function }} pool
 *        un `pg.Pool` (ou tout objet compatible)
 */
const ident = (s) => { if (!/^[a-z_][a-z0-9_]{0,40}$/.test(s)) throw new Error("PG_SCHEMA invalide"); return s; };
const toPg = (sql) => { let i = 0; return sql.replace(/\?/g, () => `$${++i}`); };

export function postgresStore(pool, { schema = "app" } = {}) {
  schema = ident(schema);
  // Chaque requête s’exécute dans une transaction courte avec SET LOCAL search_path :
  // compatible avec les poolers en mode transaction (Supabase 6543, PgBouncer).
  const withTx = async (fn) => {
    const c = pool.connect ? await pool.connect() : pool;
    try { await c.query("BEGIN"); await c.query(`SET LOCAL search_path TO ${schema}`); const r = await fn(c); await c.query("COMMIT"); return r; }
    catch (e) { await c.query("ROLLBACK").catch(() => {}); throw e; }
    finally { if (c.release) c.release(); }
  };
  const norm = (v) => (v === undefined ? null : typeof v === "boolean" ? (v ? 1 : 0) : v);
  const stmt = (sql, args = []) => ({
    sql, args,
    bind: (...a) => stmt(sql, a.map(norm)),
    first: async () => (await withTx((c) => c.query(toPg(sql), args))).rows[0] ?? null,
    all: async () => ({ results: (await withTx((c) => c.query(toPg(sql), args))).rows }),
    run: async () => ({ meta: { changes: (await withTx((c) => c.query(toPg(sql), args))).rowCount ?? 0 } }),
  });
  return {
    name: "postgres",
    dialect: "postgres",
    prepare: (sql) => stmt(sql),
    batch: (stmts) => withTx(async (c) => {
      const out = [];
      for (const s of stmts) { const r = await c.query(toPg(s.sql), s.args); out.push({ results: r.rows, meta: { changes: r.rowCount ?? 0 } }); }
      return out;
    }),
    async ensureSchema(ddl) {
      const c = pool.connect ? await pool.connect() : pool;
      try {
        await c.query("BEGIN");
        await c.query(`SELECT pg_advisory_xact_lock(hashtext('app_schema_init'))`);
        await c.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
        await c.query(`SET LOCAL search_path TO ${schema}`);
        for (const s of ddl) await c.query(s);
        // Défense en profondeur (Supabase et assimilés) : aucun accès client direct au schéma applicatif.
        await c.query(`DO $$
          DECLARE t record; r text;
          BEGIN
            FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = '${schema}' LOOP
              EXECUTE format('ALTER TABLE ${schema}.%I ENABLE ROW LEVEL SECURITY', t.tablename);
            END LOOP;
            FOREACH r IN ARRAY ARRAY['anon','authenticated','public'] LOOP
              IF r = 'public' OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
                EXECUTE format('REVOKE ALL ON SCHEMA ${schema} FROM %s', CASE WHEN r = 'public' THEN 'PUBLIC' ELSE quote_ident(r) END);
                EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA ${schema} FROM %s', CASE WHEN r = 'public' THEN 'PUBLIC' ELSE quote_ident(r) END);
              END IF;
            END LOOP;
          END $$;`);
        await c.query("COMMIT");
      } catch (e) { await c.query("ROLLBACK").catch(() => {}); throw e; }
      finally { if (c.release) c.release(); }
    },
    close: () => (pool.end ? pool.end() : undefined),
  };
}
