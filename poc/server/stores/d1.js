/** Cloudflare D1 : l'interface du cœur est celle de D1, on ajoute seulement le nom et ensureSchema. */
export function d1Store(binding) {
  return {
    name: "cloudflare-d1",
    dialect: "sqlite",
    prepare: (sql) => binding.prepare(sql),
    batch: (stmts) => binding.batch(stmts),
    ensureSchema: (ddl) => binding.batch(ddl.map((s) => binding.prepare(s))),
  };
}
