Adaptateurs de stockage. Chacun expose la même interface (celle de Cloudflare D1) :
`name`, `dialect`, `prepare(sql).bind(...).first() / .all() -> {results} / .run() -> {meta:{changes}}`,
`batch([stmts])` (transactionnel) et `ensureSchema(ddl[])`. Les requêtes du cœur utilisent des `?`.
