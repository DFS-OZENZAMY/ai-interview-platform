"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { SmokeyAuthBackground } from "./smokey-auth-background";
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
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-[#08162F] text-white">
      <SmokeyAuthBackground />
      <header className="relative z-10 mx-auto flex w-full max-w-[1360px] items-center justify-between px-5 py-6 sm:px-12 sm:py-9">
        <Link href="/" className="flex items-center gap-2.5 text-sm font-bold tracking-tight text-white">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-xl"><Sparkles size={18}/></span>
          Interview Platform
        </Link>
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-[#CDD9F2] transition hover:bg-white/10">
          <ArrowLeft size={16}/> Accueil
        </Link>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-[1160px] flex-1 items-center gap-12 px-5 pb-14 pt-4 lg:grid-cols-[1.06fr_0.94fr] lg:gap-20 lg:px-10">
        <motion.div initial={reducedMotion ? false : { opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.65 }} className="hidden max-w-xl lg:block">
          <span className="text-xs font-bold uppercase tracking-[0.19em] text-[#B7CBFF]">Votre préparation commence ici</span>
          <h1 className="mt-6 text-[clamp(2.9rem,5vw,5.1rem)] font-semibold leading-[1.07] tracking-[-0.052em]">
            Votre prochain entretien commence par une <span className="text-[#A5BEFF]">bonne préparation.</span>
          </h1>
          <p className="mt-7 max-w-md text-base leading-8 text-[#CAD6EB]">
            Créez votre espace, précisez votre objectif et entraînez-vous avec des simulations adaptées à votre parcours.
          </p>
          <div className="mt-10 flex items-center gap-3 text-sm text-[#B8C9E6]">
            <ShieldCheck className="text-[#BDD0FF]" size={20}/> Un parcours personnalisé, à votre rythme.
          </div>
        </motion.div>

        <motion.div initial={reducedMotion ? false : { opacity: 0, y: 34, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.6, delay: reducedMotion ? 0 : 0.12 }}
          className="auth-glass mx-auto w-full max-w-[466px] rounded-[30px] border border-white/25 p-6 shadow-[0_35px_95px_rgba(2,7,20,.42)] backdrop-blur-2xl sm:p-9">
          <div className="mb-8">
            <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/15 bg-white/10">
              <LockKeyhole className="text-[#C1D2FF]" size={21}/>
            </span>
            <h2 className="text-[31px] font-semibold leading-tight tracking-[-0.04em] text-white">
              {mode === "signin" ? "Prêt à vous préparer ?" : mode === "signup" ? "Créons votre espace." : "Retrouvons votre accès."}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#D6E1F4]">
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
              <label htmlFor="auth-email" className="mb-2 block text-sm font-semibold text-[#EFF3FF]">Adresse e-mail</label>
              <div className="flex min-h-12 items-center gap-3 rounded-xl border border-white/30 bg-transparent px-4 transition-colors focus-within:border-[#B5C8FF] focus-within:ring-2 focus-within:ring-[#91B0FF]/20">
                <Mail size={18} className="shrink-0 text-[#B6C6E6]" aria-hidden="true"/>
                <input id="auth-email" type="email" required autoComplete="email" value={email}
                  onChange={(e)=>setEmail(e.target.value)} placeholder="vous@exemple.com"
                  className="auth-dark-input min-w-0 flex-1 bg-transparent py-3 text-base text-white outline-none placeholder:text-[#A6B6D5]"/>
              </div>
            </div>
            {mode !== "reset" && (
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label htmlFor="auth-password" className="text-sm font-semibold text-[#EFF3FF]">Mot de passe</label>
                  {mode === "signin" && <button type="button" onClick={()=>switchMode("reset")} className="rounded-lg text-xs font-medium text-[#C1D4FF] underline-offset-4 hover:underline">Mot de passe oublié ?</button>}
                </div>
                <div className="flex min-h-12 items-center gap-3 rounded-xl border border-white/30 bg-transparent px-4 transition-colors focus-within:border-[#B5C8FF] focus-within:ring-2 focus-within:ring-[#91B0FF]/20">
                  <LockKeyhole size={18} className="shrink-0 text-[#B6C6E6]" aria-hidden="true"/>
                  <input id="auth-password" type={showPassword ? "text" : "password"} minLength={6} required autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Votre mot de passe"
                    className="auth-dark-input min-w-0 flex-1 bg-transparent py-3 text-base text-white outline-none placeholder:text-[#A6B6D5]"/>
                  <button type="button" onClick={()=>setShowPassword(p=>!p)} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    className="rounded-lg p-2 text-[#CDD9F4] hover:bg-white/10">
                    {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                  </button>
                </div>
              </div>
            )}
            {message && <p role={message.type === "error" ? "alert" : "status"}
              className={message.type === "error" ? "rounded-xl border border-rose-300/40 bg-rose-900/35 p-3 text-sm leading-6 text-rose-100" : "rounded-xl border border-emerald-300/40 bg-emerald-950/40 p-3 text-sm leading-6 text-emerald-100"}>{message.text}</p>}
            <button type="submit" disabled={busy || !ready}
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#5069E7] px-5 text-sm font-bold text-white shadow-[0_10px_30px_rgba(23,44,128,.25)] transition hover:bg-[#6480F7] disabled:cursor-not-allowed disabled:opacity-55">
              {busy ? "Un instant…" : mode === "signin" ? "Se connecter" : mode === "signup" ? "Créer mon compte" : "Envoyer le lien"}
              {!busy && <ArrowRight size={18}/>}
            </button>
          </form>
          {mode !== "reset" && <>
            <div className="my-6 flex items-center gap-3 text-xs text-[#BDCAE0]">
              <div className="h-px flex-1 bg-white/20"/>ou continuer avec<div className="h-px flex-1 bg-white/20"/>
            </div>
            <button type="button" disabled={busy || !ready} onClick={google}
              className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/25 bg-white/90 px-5 text-sm font-semibold text-[#182746] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-55">
              <span aria-hidden="true" className="font-extrabold text-[#4285F4]">G</span> Continuer avec Google
            </button>
          </>}
          <p className="mt-7 text-center text-sm text-[#DAE3F3]">
            {mode === "signin" ? "Pas encore de compte ?" : mode === "signup" ? "Vous avez déjà un compte ?" : "Vous avez retrouvé vos accès ?"}
            {" "}
            <button type="button" onClick={()=>switchMode(mode === "signin" ? "signup" : "signin")} className="min-h-10 font-bold text-white underline underline-offset-4">
              {mode === "signin" ? "S’inscrire" : "Se connecter"}
            </button>
          </p>
        </motion.div>
      </section>
      <footer className="relative z-10 px-5 pb-6 text-center text-xs text-[#B3C1D9]">
        Vos informations sont traitées selon les règles de confidentialité applicables à la plateforme.
      </footer>
    </main>
  );
}
