"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles, AudioLines, CheckCircle2 } from "lucide-react";

import { getAuthClient } from "@/lib/supabase-auth";
import { getAppRole, readProfile } from "@/lib/profile";

type Mode = "signin" | "signup" | "reset";
type Message = { type: "error" | "success"; text: string };

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const reducedMotion = useReducedMotion();
  const ready = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));

  function switchMode(next: Mode) {
    setMode(next); setMessage(null); setPassword("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const client = getAuthClient();
    if (!client) {
      setMessage({ type: "error", text: "La connexion n’est pas encore activée dans cet environnement de démonstration." });
      return;
    }
    setBusy(true); setMessage(null);
    try {
      if (mode === "reset") {
        const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: new URL("/auth/callback?type=recovery", window.location.origin).toString(),
        });
        if (error) throw error;
        setMessage({ type: "success", text: "Si un compte correspond à cet e-mail, vous recevrez des instructions de réinitialisation." });
      } else if (mode === "signup") {
        const { data, error } = await client.auth.signUp({
          email: email.trim(), password,
          options: { emailRedirectTo: new URL("/auth/callback", window.location.origin).toString() },
        });
        if (error) throw error;
        setMessage({ type: "success", text: data.session
          ? "Compte créé. Préparons maintenant votre parcours."
          : "Consultez votre boîte e-mail pour confirmer votre inscription, si la vérification est activée." });
        if (data.session) router.push("/onboarding");
      } else {
        const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (error || !data.user) throw error ?? new Error("Connexion refusée");
        const role = await getAppRole(client, data.user.id);
        if (role !== "user") {
          router.replace("/role-preview");
        } else {
          const saved = await readProfile(client, data.user.id);
          router.replace(saved?.completed ? "/dashboard" : "/onboarding");
        }
      }
    } catch (caught) {
      const failure = caught as { code?: string; status?: number; message?: string };
      const isCredentialError = failure.code === "invalid_credentials" || /invalid login credentials/i.test(failure.message ?? "");
      const isNetworkError = /fetch failed|failed to fetch|network/i.test(failure.message ?? "");
      setMessage({ type: "error", text: isCredentialError
        ? "L’adresse e-mail ou le mot de passe ne correspond pas. Vérifiez les identifiants de votre compte."
        : isNetworkError ? "Impossible de joindre le service de connexion. Vérifiez votre réseau et réessayez."
        : failure.status === 429 ? "Trop de tentatives. Réessayez dans quelques minutes."
        : "Connexion impossible pour le moment. Réessayez ou contactez l’assistance si le problème persiste." });
      if (process.env.NODE_ENV === "development") console.warn("Supabase Auth failed", { code: failure.code, status: failure.status, message: failure.message });
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const client = getAuthClient();
    if (!client) {
      setMessage({ type: "error", text: "La connexion Google n'est pas encore configurée pour cette démonstration." });
      return;
    }
    setBusy(true); setMessage(null);
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: new URL("/auth/callback", window.location.origin).toString() },
    });
    if (error) {
      setBusy(false);
      setMessage({ type: "error", text: "Impossible d'ouvrir la connexion Google. Vérifiez la configuration du fournisseur." });
    }
  }

  return (
    <main className="auth-v2 relative isolate flex min-h-dvh flex-col overflow-x-clip bg-[#F8F9FF] text-[#192340]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-48 -top-48 h-[700px] w-[700px] rounded-full bg-[#DCE5FF]/80 blur-[105px]"/>
        <div className="absolute -right-56 top-[6%] h-[730px] w-[730px] rounded-full bg-[#F7CDF5]/65 blur-[105px]"/>
        <div className="absolute bottom-[-220px] left-[24%] h-[560px] w-[560px] rounded-full bg-[#D7D0FF]/60 blur-[100px]"/>
      </div>
      <header className="relative z-10 mx-auto flex w-full max-w-[1400px] items-center justify-between px-5 py-5 sm:px-10 sm:py-8">
        <Link href="/" className="flex items-center gap-2.5 text-sm font-extrabold tracking-tight text-[#172041]">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#5268FF] via-[#8A57FF] to-[#E454D5] text-white shadow-[0_8px_28px_rgba(128,92,255,.23)]"><Sparkles size={18}/></span>
          InterviewLab
        </Link>
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/75 bg-white/65 px-4 text-sm font-semibold text-[#54617F] shadow-sm backdrop-blur-xl transition hover:bg-white">
          <ArrowLeft size={16}/> Accueil
        </Link>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-[1320px] flex-1 items-center gap-8 px-5 pb-12 pt-8 sm:px-10 lg:grid-cols-[1.03fr_.97fr] lg:gap-16 lg:py-14">
        <motion.div initial={reducedMotion ? false : { opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.65 }} className="hidden max-w-[620px] lg:block">
          <span className="text-xs font-bold uppercase tracking-[0.19em] text-[#8158ED]">Votre préparation commence ici</span>
          <h1 className="mt-6 text-[clamp(2.8rem,4.2vw,5rem)] font-extrabold leading-[1.07] tracking-[-0.052em]">
            Votre prochain entretien commence par une <span className="auth-gradient-text">bonne préparation.</span>
          </h1>
          <p className="mt-7 max-w-md text-base leading-8 text-[#64718E]">
            Créez votre espace, précisez votre objectif et entraînez-vous avec des simulations adaptées à votre parcours.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <span className="auth-perk"><ShieldCheck size={17}/> Un espace personnel</span>
            <span className="auth-perk"><AudioLines size={17}/> Entretien à l’oral</span>
            <span className="auth-perk"><CheckCircle2 size={17}/> Des conseils concrets</span>
          </div>
          <div className="auth-coach-preview mt-12 flex items-center gap-4 rounded-[26px] border border-white/90 bg-white/60 p-5 shadow-[0_15px_50px_rgba(102,84,188,.09)] backdrop-blur-xl">
            <span className="auth-pulse-orb grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#5365FF] via-[#8755F4] to-[#F064D1] text-white shadow-[0_8px_28px_rgba(132,91,235,.30)]"><AudioLines size={29}/></span>
            <div><p className="text-[11px] font-extrabold uppercase tracking-[.14em] text-[#865CE5]">Votre coach IA</p><p className="mt-1 text-sm font-semibold leading-6 text-[#28365D]">Un endroit pour s’entraîner, essayer et prendre confiance.</p></div>
          </div>
        </motion.div>

        <motion.div initial={reducedMotion ? false : { opacity: 0, y: 34, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.6, delay: reducedMotion ? 0 : 0.12 }}
          className="auth-v2-card mx-auto w-full max-w-[520px] rounded-[30px] border border-white/90 bg-white/85 p-6 shadow-[0_30px_95px_rgba(92,82,166,.14)] backdrop-blur-2xl sm:p-10">
          <div className="mb-8">
            <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-[15px] border border-[#DDD5FF] bg-[#F0EAFF]">
              <LockKeyhole className="text-[#8755E8]" size={21}/>
            </span>
            <h2 className="text-[31px] font-semibold leading-tight tracking-[-0.04em] text-[#172041]">
              {mode === "signin" ? "Prêt à vous préparer ?" : mode === "signup" ? "Créons votre espace." : "Retrouvons votre accès."}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#687591]">
              {mode === "signin" ? "Connectez-vous pour commencer votre parcours ou poursuivre votre préparation." :
                mode === "signup" ? "Quelques informations suffisent pour personnaliser votre préparation." :
                "Indiquez votre e-mail. On vous aidera à retrouver votre compte."}
            </p>
          </div>
          {!ready && (
            <div role="status" className="mb-6 rounded-xl border border-[#A9BEEC]/40 bg-[#233961]/70 p-3 text-xs leading-6 text-[#E1E9FF]">
              Démonstration UX : l’authentification sera disponible lorsque les clés publiques Supabase seront configurées.
            </div>
          )}
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label htmlFor="auth-email" className="mb-2 block text-sm font-semibold text-[#2A3555]">Adresse e-mail</label>
              <div className="flex min-h-12 items-center gap-3 rounded-xl border border-[#DCE0EF] bg-[#F9FAFF] px-4 transition-colors focus-within:border-[#885BEE] focus-within:ring-2 focus-within:ring-[#885BEE]/15">
                <Mail size={18} className="shrink-0 text-[#8794B2]" aria-hidden="true"/>
                <input id="auth-email" type="email" required autoComplete="email" value={email}
                  onChange={(e)=>setEmail(e.target.value)} placeholder="vous@exemple.com"
                  className="min-w-0 flex-1 bg-transparent py-3 text-base text-[#1F2B4B] outline-none placeholder:text-[#97A2BB]"/>
              </div>
            </div>
            {mode !== "reset" && (
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label htmlFor="auth-password" className="text-sm font-semibold text-[#2A3555]">Mot de passe</label>
                  {mode === "signin" && <button type="button" onClick={()=>switchMode("reset")} className="rounded-lg text-xs font-medium text-[#7556D9] underline-offset-4 hover:underline">Mot de passe oublié ?</button>}
                </div>
                <div className="flex min-h-12 items-center gap-3 rounded-xl border border-[#DCE0EF] bg-[#F9FAFF] px-4 transition-colors focus-within:border-[#885BEE] focus-within:ring-2 focus-within:ring-[#885BEE]/15">
                  <LockKeyhole size={18} className="shrink-0 text-[#8794B2]" aria-hidden="true"/>
                  <input id="auth-password" type={showPassword ? "text" : "password"} minLength={6} required autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Votre mot de passe"
                    className="min-w-0 flex-1 bg-transparent py-3 text-base text-[#1F2B4B] outline-none placeholder:text-[#97A2BB]"/>
                  <button type="button" onClick={()=>setShowPassword(p=>!p)} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    className="rounded-lg p-2 text-[#7C89A7] hover:bg-[#EEEAFE]">
                    {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                  </button>
                </div>
              </div>
            )}
            {message && <p role={message.type === "error" ? "alert" : "status"}
              className={message.type === "error" ? "rounded-xl border border-rose-300/40 bg-rose-900/35 p-3 text-sm leading-6 text-rose-100" : "rounded-xl border border-emerald-300/40 bg-emerald-950/40 p-3 text-sm leading-6 text-emerald-100"}>{message.text}</p>}
            <button type="submit" disabled={busy || !ready}
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 auth-v2-primary rounded-xl px-5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-55">
              {busy ? "Un instant…" : mode === "signin" ? "Se connecter" : mode === "signup" ? "Créer mon compte" : "Envoyer le lien"}
              {!busy && <ArrowRight size={18}/>}
            </button>
          </form>
          {mode !== "reset" && <>
            <div className="my-6 flex items-center gap-3 text-xs text-[#8B95AC]">
              <div className="h-px flex-1 bg-[#E1E4F0]"/>ou continuer avec<div className="h-px flex-1 bg-[#E1E4F0]"/>
            </div>
            <button type="button" disabled={busy || !ready} onClick={google}
              className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#DADEEE] bg-white px-5 text-sm font-semibold text-[#182746] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-55">
              <span aria-hidden="true" className="font-extrabold text-[#4285F4]">G</span> Continuer avec Google
            </button>
          </>}
          <p className="mt-7 text-center text-sm text-[#6F7C99]">
            {mode === "signin" ? "Pas encore de compte ?" : mode === "signup" ? "Vous avez déjà un compte ?" : "Vous avez retrouvé vos accès ?"}
            {" "}
            <button type="button" onClick={()=>switchMode(mode === "signin" ? "signup" : "signin")} className="min-h-10 font-bold text-[#7753E2] underline underline-offset-4">
              {mode === "signin" ? "S’inscrire" : "Se connecter"}
            </button>
          </p>
        </motion.div>
      </section>
      <footer className="relative z-10 px-5 pb-6 text-center text-xs text-[#7784A0]">
        Vos informations sont traitées selon les règles de confidentialité applicables à la plateforme.
      </footer>
    </main>
  );
}
