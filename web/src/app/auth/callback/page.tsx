"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAuthClient } from "@/lib/supabase-auth";
import { getAppRole, readProfile } from "@/lib/profile";

export default function AuthCallbackPage() {
  const [error, setError] = useState("");
  useEffect(() => {
    const client = getAuthClient();
    if (!client) return;
    let active = true;
    async function finish() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const type = params.get("type");
      if (code) {
        const result = await client!.auth.exchangeCodeForSession(code);
        if (result.error) {
          if (active) setError("Le lien de connexion a expiré ou n'est plus valide.");
          return;
        }
      }
      const { data, error } = await client!.auth.getUser();
      if (!active) return;
      if (error || !data.user) {
        setError("Impossible de terminer la connexion. Revenez à l'écran de connexion.");
        return;
      }
      if (type === "recovery") {
        window.location.replace("/auth/update-password");
        return;
      }
      try {
        const role = await getAppRole(client!, data.user.id);
        if (role !== "user") {
          window.location.replace("/role-preview");
        } else {
          const saved = await readProfile(client!, data.user.id);
          window.location.replace(saved?.completed ? "/dashboard" : "/onboarding");
        }
      } catch {
        if (active) setError("Nous n’avons pas pu retrouver votre profil. Réessayez.");
      }
    }
    void finish();
    return () => { active = false; };
  }, []);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-[#0B1936] px-6 text-center text-white">
      <h1 className="text-3xl font-semibold">{error ? "On n'a pas pu terminer la connexion." : "On prépare votre espace…"}</h1>
      {error && <><p role="alert" className="max-w-md text-[#D5E1FA]">{error}</p><Link href="/login" className="rounded-xl bg-white px-6 py-3 font-semibold text-[#14234C]">Retour à la connexion</Link></>}
    </main>
  );
}
