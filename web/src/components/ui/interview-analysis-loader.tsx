"use client";

import { motion, useReducedMotion } from "motion/react";
import { AudioLines, BrainCircuit, Check, Sparkles } from "lucide-react";

export function InterviewAnalysisLoader({ onReturn }: { onReturn?: () => void }) {
  const reduced = useReducedMotion();
  return (
    <main className="analysis-v2 relative isolate flex min-h-dvh flex-col items-center justify-center overflow-x-clip bg-[#F8F9FF] px-4 py-12 text-[#172041] sm:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-56 -top-60 size-[740px] rounded-full bg-[#DCE5FF]/70 blur-[115px]"/>
        <div className="absolute -right-48 -top-32 size-[700px] rounded-full bg-[#F9CEEF]/65 blur-[110px]"/>
        <div className="absolute bottom-[-300px] left-[22%] size-[650px] rounded-full bg-[#DCD2FF]/65 blur-[120px]"/>
      </div>
      <div className="relative z-10 mx-auto w-full max-w-[760px]">
        <div className="mb-8 flex items-center justify-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-[#5365FF] via-[#8755F4] to-[#E054C9] text-white shadow-[0_9px_24px_rgba(117,86,236,.22)]"><Sparkles size={19}/></span>
          <span className="text-sm font-extrabold tracking-[-.04em] text-[#273050]">Interview<span className="text-[#8755E8]">Lab</span></span>
        </div>
        <div className="analysis-v2-glow pointer-events-none absolute inset-x-[10%] bottom-[-50px] -z-10 h-[230px] rounded-[55%] bg-gradient-to-r from-[#5984FF]/45 via-[#A568F9]/55 to-[#F477CD]/55 blur-[70px]" aria-hidden="true" />
        <motion.section
          initial={reduced ? false : {opacity:0,y:20,scale:.985}}
          animate={{opacity:1,y:0,scale:1}}
          transition={{duration:.65,ease:[.2,.8,.2,1]}}
          className="analysis-v2-card relative overflow-hidden rounded-[32px] border border-white/95 bg-white/80 px-6 pb-9 pt-10 text-center shadow-[0_30px_105px_rgba(109,91,190,.15)] backdrop-blur-2xl sm:px-12 sm:pb-12 sm:pt-12"
          role="status"
          aria-live="polite"
          aria-label="Analyse de votre entretien en cours"
        >
          <div className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-[#DDD5FD] bg-[#F4F0FF] px-4 py-2 text-[11px] font-bold uppercase tracking-[.13em] text-[#7955DC]"><span className="size-2 rounded-full bg-[#8F62EF]"/> Après l’entretien</div>
          <div className="relative mx-auto mb-8 grid size-28 place-items-center sm:size-32" aria-hidden="true">
            <div className="analysis-v2-ring absolute inset-0 rounded-full border border-[#BDA4FD]/45"/>
            <div className="analysis-v2-ring-alt absolute inset-3 rounded-full border border-[#DA9CEB]/45"/>
            <div className="analysis-v2-core grid size-[76px] place-items-center rounded-[26px] bg-gradient-to-br from-[#667CFF] via-[#9161F7] to-[#E56ACD] text-white shadow-[0_18px_36px_rgba(137,89,230,.27),inset_0_1px_0_rgba(255,255,255,.6)] sm:size-[86px]"><BrainCircuit size={38} strokeWidth={1.7}/></div>
          </div>
          <h1 className="mx-auto max-w-[570px] text-balance text-[clamp(1.8rem,4.4vw,2.9rem)] font-extrabold leading-[1.14] tracking-[-.055em] text-[#192344]">Votre entretien se termine.<br/><span className="analysis-v2-gradient">Votre progression commence.</span></h1>
          <p className="mx-auto mt-5 max-w-[470px] text-[15px] leading-7 text-[#65728F]">Nous traitons votre dernière réponse et préparons votre retour pédagogique. Vous retrouverez les points essentiels dès qu’il sera disponible.</p>

          <div className="mx-auto mt-9 max-w-[480px] rounded-[22px] border border-[#E7E6F7] bg-[#FCFBFF]/90 p-5 text-left">
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-[#344366]">Préparation du retour</span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#8B60E9]"><span className="analysis-v2-live size-2 rounded-full bg-[#986CF2]"/> En cours</span>
            </div>
            <div className="analysis-v2-progress relative h-2 overflow-hidden rounded-full bg-[#E9E5FC]" aria-label="Traitement en cours, durée indéterminée">
              <div className="analysis-v2-indeterminate absolute inset-y-0 w-[36%] rounded-full bg-gradient-to-r from-[#5365FF] via-[#925AF4] to-[#EC72CF]"/>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#55617E]"><AudioLines size={16} className="text-[#6C79E9]"/> Traitement de la réponse</span>
              <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#55617E]"><Check size={16} className="text-[#9A66DF]"/> Retour en préparation</span>
            </div>
          </div>
          <p className="mt-7 text-xs leading-6 text-[#8B95AC]">Aucun score n’est calculé ou affiché artificiellement pendant cette attente.</p>
        </motion.section>
        {onReturn&&<div className="mt-8 flex justify-center"><button onClick={onReturn} className="analysis-v2-secondary min-h-12 rounded-2xl px-6 text-sm font-semibold text-[#495779]">Retour à la préparation</button></div>}
      </div>
    </main>
  );
}
