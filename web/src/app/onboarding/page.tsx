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
    <main className="onboarding-v2 relative isolate min-h-dvh overflow-x-clip bg-[#F8F9FF] pb-14 text-[#172033] [color-scheme:light]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-36 -top-40 h-[650px] w-[650px] rounded-full bg-[#DDE6FF]/70 blur-[105px]"/>
        <div className="absolute -right-40 top-16 h-[600px] w-[600px] rounded-full bg-[#F5CEF5]/60 blur-[105px]"/>
        <div className="absolute bottom-[-260px] left-1/4 h-[550px] w-[550px] rounded-full bg-[#D8D1FF]/55 blur-[110px]"/>
      </div>
      <nav className="relative z-10 mx-auto flex max-w-[1360px] items-center justify-between px-5 py-6 sm:px-10 sm:py-8">
        <Link href="/" className="flex items-center gap-2.5 text-sm font-extrabold text-[#172041]">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#5268FF] via-[#8A57FF] to-[#E454D5] text-white shadow-[0_8px_28px_rgba(128,92,255,.23)]"><Sparkles size={18}/></span>
          InterviewLab
        </Link>
        <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/75 bg-white/65 px-4 text-sm font-semibold text-[#54617F] shadow-sm backdrop-blur-xl transition hover:bg-white">
          <ArrowLeft size={16}/> Mon espace
        </Link>
      </nav>
      <div className="relative z-10 px-0 pt-4 sm:pt-7">
        {error ? <p role="alert" className="mx-auto max-w-xl rounded-2xl border border-[#DDE5F2] bg-white p-5 text-sm text-[#172033]">{error}</p> :
          initialProfile === null ? <div className="mx-auto max-w-lg py-24 text-center text-[#526079]" role="status">On prépare votre parcours…</div> :
          <OnboardingStages onComplete={handleComplete} initialProfile={initialProfile} />}
      </div>
    </main>
  );
}
