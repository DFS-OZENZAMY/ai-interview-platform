/**
 * One-off, local-only provisioning through Supabase Auth Admin API.
 * Never put an admin/service-role key in NEXT_PUBLIC_ variables.
 * Run with SUPABASE_ADMIN_KEY in the environment, entered on the Mac.
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const envPath = path.resolve(".env.local");
if (!fs.existsSync(envPath)) throw new Error("web/.env.local introuvable");
const match = fs.readFileSync(envPath, "utf8").match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m);
const url = match?.[1]?.trim();
const adminKey = process.env.SUPABASE_ADMIN_KEY;
if (!url || !adminKey) throw new Error("URL ou SUPABASE_ADMIN_KEY manquante");
const client = createClient(url, adminKey, { auth: { autoRefreshToken: false, persistSession: false } });
const accounts = [
  ["user@user.com", "user"],
  ["admin@admin.com", "admin"],
  ["coach@coach.com", "coach"],
];
const folder = path.join(os.homedir(), "ai-interview-platform", ".demo-credentials");
fs.mkdirSync(folder, { recursive: true, mode: 0o700 });
const file = path.join(folder, "test-accounts.txt");
const fd = fs.openSync(file, "wx", 0o600);
let created = 0;
try {
  fs.writeSync(fd, "# Credentials de démonstration — LOCAL UNIQUEMENT\n# Ne jamais committer ou partager.\n");
  for (const [email, role] of accounts) {
    const password = randomBytes(24).toString("base64url");
    const { data, error } = await client.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) throw new Error(`Échec de création de ${email}: ${error?.message ?? "unknown"}`);
    fs.writeSync(fd, `${email} | ${password} | ${role}\n`);
    created++;
    const { error: roleError } = await client.from("app_user_roles").upsert({ user_id: data.user.id, role });
    if (roleError) throw new Error(`Rôle non enregistré pour ${email}: ${roleError.message}`);
    process.stdout.write(`Compte créé : ${email} (rôle ${role})\n`);
  }
  process.stdout.write(`\n${created}/3 comptes créés. Identifiants locaux : ${file}\n`);
} catch (error) {
  process.stderr.write(`\n${error.message}\n${created} compte(s) créés ; leurs identifiants sont dans ${file}. Ne pas relancer sans vérifier les doublons.\n`);
  process.exitCode = 1;
} finally {
  fs.closeSync(fd);
}
