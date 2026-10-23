"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getAuthClient } from "@/lib/supabase-auth";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function update(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const client = getAuthClient();
    if (!client) { setMessage("La connexion n’est pas encore configurée."); return; }
    setBusy(true); setMessage("");
    const { data: { user }, error: sessionError } = await client.auth.getUser();
    if (sessionError || !user) {
      setMessage("Le lien de réinitialisation n’est plus valide. Demandez un nouveau lien.");
      setBusy(false); return;
    }
    const { error } = await client.auth.updateUser({ password });
    setBusy(false);
    if (error) setMessage("Impossible de mettre à jour le mot de passe. Réessayez.");
    else router.replace("/login");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#0B1936] px-5 text-white">
      <section className="auth-glass w-full max-w-md rounded-3xl border border-white/25 p-8">
        <h1 className="text-3xl font-semibold">Un nouveau départ, en sécurité.</h1>
        <p className="mt-3 text-sm leading-7 text-[#D0DDF5]">Choisissez un nouveau mot de passe pour retrouver votre compte.</p>
        <form onSubmit={update} className="mt-7 space-y-5">
          <label className="block text-sm font-semibold">Nouveau mot de passe
            <input type="password" autoComplete="new-password" minLength={8} required value={password}
              onChange={e=>setPassword(e.target.value)}
              className="mt-2 block min-h-12 w-full rounded-xl border border-white/30 bg-[#10264B] px-4 text-white"/>
          </label>
          {message && <p role="alert" className="text-sm text-rose-100">{message}</p>}
          <button disabled={busy} className="min-h-12 w-full rounded-xl bg-[#5069E7] font-semibold text-white disabled:opacity-50">
            {busy ? "Mise à jour…" : "Enregistrer mon mot de passe"}
          </button>
        </form>
        <Link href="/login" className="mt-5 inline-block text-sm text-[#C9DAFF] underline">Retour à la connexion</Link>
      </section>
    </main>
  );
}
