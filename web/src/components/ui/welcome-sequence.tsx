"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Languages, Sparkles, Target, TrendingUp } from "lucide-react";
import type { OnboardingProfile } from "./onboarding-stages";

type Props = {
  profile: OnboardingProfile;
  objective: string;
  priorities: string[];
  onContinue: () => void;
  onPrevious: () => void;
};

const message = "Votre objectif est clair. Maintenant, on va le préparer ensemble.";
const words = message.split(" ");
const revealDuration = 3450;

export function WelcomeSequence({ profile, objective, priorities, onContinue, onPrevious }: Props) {
  const reducedMotion = useReducedMotion();
  const [sequenceComplete, setSequenceComplete] = useState(false);
  const animate = reducedMotion !== true;
  const ctaReady = reducedMotion === true || sequenceComplete;
  const firstName = profile.firstName.trim();
  const language = profile.preferredLocale === "en" ? "English" : "Français";
  const chapters = [
    { label: "NOTRE OBJECTIF", text: objective, icon: Target, delay: 1.7 },
    { label: "CE QU’ON VA TRAVAILLER", text: priorities.join(" · "), icon: TrendingUp, delay: 2.05 },
    { label: "ON S’ENTRAÎNE EN", text: language, icon: Languages, delay: 2.4 },
  ];

  useEffect(() => {
    if (!animate) return;
    const timer = window.setTimeout(() => setSequenceComplete(true), revealDuration);
    return () => window.clearTimeout(timer);
  }, [animate]);

  return (
    <section data-testid="welcome-sequence" aria-label="Bienvenue dans notre espace"
      className="welcome-v6 fixed inset-0 z-50 isolate flex min-h-dvh flex-col overflow-x-hidden overflow-y-auto text-[#172033]"
      style={{ backgroundColor: "#EDF3FE",
        backgroundImage: "radial-gradient(ellipse 56% 78% at 92% 18%, rgba(156,174,246,.35), transparent 75%), radial-gradient(ellipse 65% 78% at 8% 92%, rgba(189,211,254,.40), transparent 72%), linear-gradient(130deg,#F4F7FF 0%,#EAF0FC 48%,#EEEAFB 100%)",
        color: "#172033" }}>
      <div className="welcome-v6-glow welcome-v6-glow-one" aria-hidden="true"/>
      <div className="welcome-v6-glow welcome-v6-glow-two" aria-hidden="true"/>
      <div className="welcome-v6-orbit" aria-hidden="true"/>

      <header className="relative z-10 mx-auto flex w-full max-w-[1420px] items-center justify-between px-6 py-6 sm:px-12 sm:py-9">
        <span className="flex items-center gap-2.5 text-[13px] font-semibold tracking-[-0.01em] text-[#172033]">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-[#B9C8EC] bg-white/65 text-[#2947A3]"><Sparkles size={18}/></span>
          Interview Platform
        </span>
        <span className="hidden text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4B64A7] sm:block">Notre aventure commence ici</span>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-[1000px] flex-1 flex-col justify-center px-6 pb-12 pt-8 sm:px-12 sm:pb-20">
        <motion.div initial={animate ? { opacity: 0, scale: 0.5, rotate: -25, y: 36 } : false}
          animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
          transition={animate ? { type: "spring", stiffness: 165, damping: 15, delay: 0.05 } : { duration: 0 }}
          className="mb-7 grid h-[66px] w-[66px] place-items-center rounded-[23px] border border-[#A1B5FB] bg-[#DDE7FF] shadow-[0_14px_72px_rgba(92,125,255,0.24)] backdrop-blur-xl">
          <Sparkles size={31} className="text-[#3656BF]"/>
        </motion.div>
        <motion.p initial={animate ? { opacity: 0, x: -45 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: animate ? 0.55 : 0, delay: animate ? 0.12 : 0 }}
          className="mb-4 text-[11px] font-bold uppercase tracking-[0.25em] text-[#3E59A5]">
          Un nouveau chapitre commence
        </motion.p>

        <motion.h1 initial={animate ? { opacity: 0, y: 65, scale: 0.88, filter: "blur(18px)" } : false}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: animate ? 0.85 : 0, delay: animate ? 0.2 : 0, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-[940px] text-[clamp(3.5rem,8vw,7.6rem)] font-semibold leading-[0.99] tracking-[-0.065em] text-[#121D36]">
          Bienvenue{firstName ? `, ${firstName}` : ""}<span className="text-[#4762DB]">.</span>
        </motion.h1>

        <p aria-label={message}
          className="mt-7 max-w-[820px] text-[clamp(1.12rem,2.6vw,1.75rem)] font-medium leading-[1.5] tracking-[-0.022em] text-[#334462] sm:mt-9">
          {words.map((word, index) => (
            <motion.span key={index} aria-hidden="true" className="mr-[0.31em] inline-block"
              initial={animate ? { opacity: 0, y: 30, scale: 0.84, filter: "blur(11px)" } : false}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: animate ? 0.5 : 0, delay: animate ? 0.95 + index * 0.087 : 0, ease: [0.16, 1, 0.3, 1] }}>
              {word}
            </motion.span>
          ))}
        </p>

        <div className="mt-11 grid gap-3 sm:mt-14 sm:grid-cols-3" aria-label="Notre plan de préparation">
          {chapters.map(({ label, text, icon: Icon, delay }, i) => (
            <motion.div key={label} initial={animate ? { opacity: 0, y: 75, rotateX: 22, scale: 0.9, filter: "blur(9px)" } : false}
              animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: animate ? 0.65 : 0, delay: animate ? delay : 0, ease: [0.16, 1, 0.3, 1] }}
              className="welcome-v6-card relative min-h-[136px] overflow-hidden rounded-[22px] p-5 sm:min-h-[162px] sm:p-6"
              style={{ transformPerspective: 1000 }}>
              <span className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#6483DB]/50 to-transparent" aria-hidden="true"/>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#3656A1]">
                <Icon size={17} aria-hidden="true"/> {label}
              </div>
              <p className="mt-5 text-[15px] font-semibold leading-6 text-[#172033] sm:text-base">{text}</p>
              <span className="absolute bottom-4 right-5 text-xs font-medium text-[#6980AA]" aria-hidden="true">0{i+1}</span>
            </motion.div>
          ))}
        </div>

        <div className="mt-9 flex min-h-[91px] flex-wrap items-center justify-between gap-3 border-t border-[#A7B9DE]/50 pt-6 sm:mt-12">
          <button type="button" onClick={onPrevious}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-[#415474] transition hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2947A3]">
            <ArrowLeft size={18}/> Précédent
          </button>
          {ctaReady && (
            <motion.button type="button" onClick={onContinue} data-testid="welcome-cta"
              initial={animate ? { opacity: 0, scale: 0.78, y: 42, filter: "blur(10px)" } : false}
              animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
              transition={animate ? { type: "spring", stiffness: 170, damping: 16 } : { duration: 0 }}
              className="welcome-v6-cta inline-flex min-h-[54px] items-center justify-center gap-3 rounded-2xl px-7 text-sm font-bold text-white shadow-[0_16px_50px_rgba(41,71,163,0.24)] transition hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2947A3]"
              style={{ backgroundColor: "#2947A3", backgroundImage: "linear-gradient(110deg,#2947A3,#3D5AC3)", color: "#FFFFFF", border: "1px solid #27469F" }}>
              Découvrir notre espace <ArrowRight size={19}/>
            </motion.button>
          )}
        </div>
        <p className="mt-3 text-[11px] leading-5 text-[#637494]">Votre parcours est enregistré. On est prêts pour la suite.</p>
      </div>
    </section>
  );
}
