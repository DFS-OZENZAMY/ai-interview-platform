"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { OnboardingStages, type OnboardingProfile } from "@/components/ui/onboarding-stages";
import { getAuthClient } from "@/lib/supabase-auth";
import { readProfile, writeProfile } from "@/lib/profile";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const [initialProfile, setInitialProfile] = useState<Partial<OnboardingProfile> | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    async function load() {
      const supabase = getAuthClient();
      if (!supabase) { if (mounted) setError("Supabase n’est pas configuré."); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      try {
        const saved = await readProfile(supabase, user.id);
        if (mounted) setInitialProfile(saved?.profile ?? {});
      } catch { if (mounted) setError("Nous n’avons pas pu charger vos informations."); }
    }
    void load();
    return () => { mounted = false; };
  }, [router]);

  async function handleComplete(profile: OnboardingProfile) {
    const supabase = getAuthClient();
    if (!supabase) throw new Error("Client non configuré");
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!user || error) throw new Error("Session expirée");
    await writeProfile(supabase, user.id, profile);
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#EDF3FE] pb-14 text-[#172033] [color-scheme:light]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_48%_at_80%_0%,rgba(156,174,246,.35),transparent_80%)]" />
      <nav className="relative z-10 mx-auto flex max-w-[1500px] items-center justify-between px-5 py-6 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-[#172033]">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-[#B9C8EC] bg-white/65 text-[#2947A3]"><Sparkles size={18}/></span>
          Interview Platform
        </Link>
        <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-[#415474] hover:bg-white/60">
          <ArrowLeft size={16}/> Mon espace
        </Link>
      </nav>
      <div className="relative z-10 px-0">
        {error ? <p role="alert" className="mx-auto max-w-xl rounded-2xl border border-[#DDE5F2] bg-white p-5 text-sm text-[#172033]">{error}</p> :
          initialProfile === null ? <div className="mx-auto max-w-lg py-24 text-center text-[#526079]" role="status">On prépare votre parcours…</div> :
          <OnboardingStages onComplete={handleComplete} initialProfile={initialProfile} />}
      </div>
    </main>
  );
}
