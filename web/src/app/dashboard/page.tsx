"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, BookOpen, BrainCircuit, Check, ChevronRight, CirclePlay, GraduationCap, LayoutDashboard, LogOut, MessageSquareText, Play, Sparkles, Target, TrendingUp, UserRound, WandSparkles } from "lucide-react";
import { getAuthClient } from "@/lib/supabase-auth";
import { getAppRole, readProfile } from "@/lib/profile";
import { employmentOptions, professionalOptions, type OnboardingProfile, type ProfessionalGoal, type PreparationGoal } from "@/components/ui/onboarding-stages";
import { InterviewScoreGauge } from "@/components/ui/interview-score-gauge";
import { readInterviewResults, comparableProgress, type InterviewResult } from "@/lib/interview-results";

const goalNames = Object.fromEntries(professionalOptions.map(item => [item.value,item.title])) as Record<ProfessionalGoal,string>;
const priorityNames: Record<PreparationGoal,string> = { confidence:"Confiance en soi", answer_structure:"Structure des réponses", communication:"Communication",domain_knowledge:"Connaissances métier",stress_management:"Gestion du stress" };
const panel = "rounded-[24px] border border-[#E0E5F1] bg-white/90 shadow-[0_12px_36px_rgba(51,76,133,.055)]";
const skillTones = [
  {bg:"bg-[#E4F6F1]",ink:"text-[#17836C]",border:"border-[#C4E9DD]"},
  {bg:"bg-[#F2EAFE]",ink:"text-[#7153B9]",border:"border-[#DED1F7]"},
  {bg:"bg-[#E8F2FF]",ink:"text-[#315EC0]",border:"border-[#CFE0FA]"},
];
export default function DashboardPage() {
 const router=useRouter();
 const reducedMotion=useReducedMotion();
 const [profile,setProfile]=useState<OnboardingProfile | null | undefined>(undefined);
 const [loadError,setLoadError]=useState("");
 const [results,setResults]=useState<InterviewResult[]>([]);
 useEffect(()=>{
   let active=true;
   async function load(){
     try {
       const client=getAuthClient();
       if(!client) throw new Error("Supabase n’est pas configuré.");
       const {data:{user},error}=await client.auth.getUser();
       if(error) throw error;
       if(!user){router.replace("/login");return;}
       const role=await getAppRole(client,user.id);
       if(role!=="user"){router.replace("/role-preview");return;}
       const saved=await readProfile(client,user.id);
       if(!saved?.completed){router.replace("/onboarding");return;}
       const interviews=await readInterviewResults(client,user.id);
       if(active){setResults(interviews);setProfile(saved.profile);}
     }catch{if(active)setLoadError("Impossible de charger votre espace. Veuillez réessayer.");}
   }
   void load();return ()=>{active=false;};
 },[router]);
 async function signOut(){const client=getAuthClient();await client?.auth.signOut();router.replace("/login");router.refresh();}
 const motionIn=(delay:number)=>({initial:reducedMotion?false as const:{opacity:0,y:24},animate:{opacity:1,y:0},transition:{duration:.56,delay,ease:"easeOut" as const}});
 const trend=comparableProgress(results);
 const coach=results.find(r=>r.coach_priority&&r.coach_recommendation);
 const hasHistory=results.length>0;
 const hasSeveral=results.length>1;
 const actionTitle=!hasHistory?"Votre premier entretien commence ici.":hasSeveral&&coach?"Travaillez votre prochain objectif.":"Continuez votre préparation.";
 const actionBody=!hasHistory?"Entraînez-vous en entretien RH ou technique, avec des questions adaptées à votre objectif.":coach?`Votre prochain défi : ${coach.coach_priority}. Retrouvez vos objectifs dans une nouvelle simulation.`:"Chaque entretien est une occasion de progresser. Configurez votre prochaine séance.";
 const situation=profile?.employmentStatus?employmentOptions.find(x=>x.value===profile.employmentStatus)?.title:null;
 return <main className="relative min-h-screen overflow-hidden bg-[#F5F7FC] text-[#172033]">
   <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_60%_at_88%_2%,rgba(199,213,255,.43),transparent_75%)]" aria-hidden/>
   <div className="relative mx-auto flex min-h-screen max-w-[1640px]">
    <aside className="sticky top-0 hidden h-screen w-[212px] shrink-0 flex-col border-r border-[#E0E6F1] bg-white/75 px-4 py-6 lg:flex">
      <Link href="/" className="flex items-center gap-2.5 px-2 text-[14px] font-extrabold tracking-tight"><span className="grid size-10 place-items-center rounded-[13px] bg-[#E2E9FF] text-[#3E56C1]"><Sparkles size={21}/></span><span>Interview<span className="block text-[10px] font-semibold tracking-[.15em] text-[#6779A2]">PLATFORM</span></span></Link>
      <p className="mb-3 mt-12 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#8593AF]">Espace candidat</p>
      <nav aria-label="Navigation candidat" className="space-y-1.5">
       <Link href="/dashboard" aria-current="page" className="flex min-h-12 items-center gap-3 rounded-xl bg-[#E8EDFF] px-3.5 text-sm font-bold text-[#3A55B9]"><LayoutDashboard size={18}/> Vue d’ensemble</Link>
       <Link href="/preparation" className="flex min-h-12 items-center gap-3 rounded-xl px-3.5 text-sm font-medium text-[#62718D] transition hover:bg-[#F0F4FE] hover:text-[#3A55B9]"><CirclePlay size={18}/> Simulation</Link>
       <Link href="/onboarding" className="flex min-h-12 items-center gap-3 rounded-xl px-3.5 text-sm font-medium text-[#62718D] transition hover:bg-[#F0F4FE] hover:text-[#3A55B9]"><UserRound size={18}/> Mon profil</Link>
      </nav>
      <div className="mt-auto rounded-2xl border border-[#E4D9FA] bg-[#F5EFFD] p-4"><div className="flex items-center gap-2 text-xs font-bold text-[#7055B3]"><BrainCircuit size={17}/> Coach IA</div><p className="mt-2 text-xs leading-6 text-[#695F83]">Des conseils personnalisés après votre premier entretien.</p></div>
      <button onClick={signOut} className="mt-4 flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm text-[#71809A] transition hover:bg-[#F0F4FE]"><LogOut size={17}/> Se déconnecter</button>
    </aside>
    <div className="min-w-0 flex-1">
     <header className="flex min-h-[78px] items-center justify-between gap-4 border-b border-[#E1E6F1] bg-white/55 px-5 sm:px-8 lg:px-9">
      <div className="flex items-center gap-2 text-xs font-semibold text-[#70819F]"><LayoutDashboard size={17} className="text-[#4770D8]"/><span className="hidden sm:inline">Espace candidat</span><ChevronRight size={13} className="hidden sm:inline"/><span className="text-[#172033]">Vue d’ensemble</span></div>
      <div className="flex items-center gap-3">
       <span className="hidden rounded-full bg-[#E5F6EF] px-3 py-2 text-xs font-semibold text-[#237B65] sm:inline-flex"><span className="mr-2 h-2 w-2 rounded-full bg-[#33B996]"/> Mon espace</span>
       <Link href="/onboarding" aria-label="Accéder à mon profil" className="grid size-10 place-items-center rounded-full border border-[#CFDAF5] bg-white text-[#4665BD] transition hover:bg-[#EEF2FF]"><UserRound size={18}/></Link>
       <button onClick={signOut} aria-label="Se déconnecter" className="grid size-10 place-items-center rounded-full border border-[#CFDAF5] text-[#4665BD] lg:hidden"><LogOut size={18}/></button>
      </div>
     </header>
     <div className="w-full px-5 pb-16 pt-9 sm:px-8 lg:px-9">
      {loadError?<div role="alert" className={panel+" p-8"}>{loadError}<button onClick={()=>window.location.reload()} className="ml-3 font-semibold text-[#3456D7] underline">Réessayer</button></div>:
       profile===undefined?<div role="status" className="space-y-4 animate-pulse"><div className="h-14 w-2/3 rounded-xl bg-[#E3E9F7]"/><div className="h-56 rounded-2xl bg-[#E3E9F7]"/><div className="h-40 rounded-2xl bg-[#E3E9F7]"/></div>:
       profile===null?<section className={panel+" p-10"}><h1 className="text-3xl font-bold">Bienvenue dans votre espace</h1><p className="mt-3 text-[#61718F]">Complétez votre profil pour personnaliser votre préparation.</p><Link href="/onboarding" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#3456D7] px-6 py-3 font-bold text-white">Compléter mon profil <ArrowRight size={17}/></Link></section>:
       <>
        <motion.section {...motionIn(0)} className="mb-7 flex flex-wrap items-end justify-between gap-5">
         <div><p className="mb-2 text-[11px] font-extrabold uppercase tracking-[.18em] text-[#4D65BC]">Votre espace de préparation</p><h1 className="text-[clamp(2.2rem,3.6vw,3.6rem)] font-bold leading-[1.09] tracking-[-.055em]">Bonjour, {profile.firstName || "vous"}<span className="text-[#5272DF]">.</span></h1><p className="mt-3 max-w-2xl text-sm leading-7 text-[#60718F]">Une étape à la fois, développez vos compétences et préparez vos prochains entretiens.</p></div>
        </motion.section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(285px,.85fr)]">
         <div className="space-y-4">
          <motion.section {...motionIn(.08)} className="relative overflow-hidden rounded-[25px] border border-[#CBD4FA] bg-[linear-gradient(125deg,#EEF2FF,#E6EAFD_62%,#EDE7FF)] p-7 shadow-[0_12px_35px_rgba(76,93,158,.10)] sm:p-8">
           <div className="pointer-events-none absolute -right-24 -top-32 size-80 rounded-full bg-[#A69DFC]/22 blur-3xl" aria-hidden/>
           <div className="relative"><span className="inline-flex items-center gap-2 rounded-full border border-[#C1C8F6] bg-white/75 px-3 py-1.5 text-xs font-bold text-[#4D57B0]"><WandSparkles size={15}/> Votre prochaine étape</span>
            <h2 className="mt-5 max-w-xl text-[clamp(1.7rem,2.5vw,2.5rem)] font-bold leading-[1.13] tracking-[-.04em]">{actionTitle}</h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-[#5B6887]">{actionBody}</p>
            <div className="mt-7 flex flex-wrap items-center gap-3"><Link href="/preparation" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#3456D7] px-5 text-sm font-bold text-white transition hover:bg-[#2644B9]"><Play size={17} fill="currentColor"/> {hasHistory?"Configurer ma prochaine simulation":"Configurer ma première simulation"}</Link><span className="text-xs font-medium text-[#687799]">Une préparation à votre rythme</span></div>
           </div>
          </motion.section>

          <motion.section {...motionIn(.15)} aria-label="Votre progression" className="grid gap-3 sm:grid-cols-3">
           {[
            {label:"Simulations",value:String(results.length),note:hasHistory?"Séances enregistrées":"Aucune séance réalisée",icon:MessageSquareText,tone:"border-[#C9D8F9] bg-[#EDF3FF] text-[#315EC0]"},
            {label:"Dernier score",value:trend.score===null?"—":String(trend.score),note:trend.score===null?"Pas encore de bilan noté":"Dernière évaluation disponible",icon:Target,tone:"border-[#BFE6D8] bg-[#E9F9F2] text-[#17836C]"},
            {label:"Progression",value:trend.delta===null?"—":`${trend.delta>0?"+":""}${trend.delta} pt`,note:trend.delta===null?"En attente de bilans comparables":"Même type d’entretien",icon:TrendingUp,tone:"border-[#EDD9B8] bg-[#FFF5E7] text-[#A77025]"}
           ].map(({label,value,note,icon:Icon,tone})=><div key={label} className={`rounded-[20px] border p-5 transition duration-300 hover:-translate-y-1 ${tone}`}><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold">{label}</p><Icon size={20}/></div><div className="mt-5 text-4xl font-bold leading-none text-[#172033]">{value}</div><p className="mt-3 text-xs leading-5 text-[#66748E]">{note}</p></div>)}
          </motion.section>

          <motion.section {...motionIn(.22)} className={panel+" p-6 sm:p-7"}>
           <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-bold">Votre parcours de préparation</h2><p className="mt-1 text-xs text-[#73819A]">Un plan adapté à votre profil, étape par étape.</p></div><span className="rounded-full bg-[#E8F6EE] px-3 py-1.5 text-xs font-semibold text-[#218268]">{!hasHistory?"Première étape":hasSeveral?"Parcours en cours":"Premier bilan"}</span></div>
           <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              {label:"Profil créé",detail:"Vos objectifs sont enregistrés",icon:Check,state:"done"},
              {label:"Première simulation",detail:hasHistory?"Votre premier entretien est enregistré":"Choisissez votre type d’entretien",icon:CirclePlay,state:hasHistory?"done":"next"},
              {label:"Analyse et conseils",detail:coach?"Une recommandation est disponible":"Disponible après analyse d’une séance",icon:BrainCircuit,state:coach?"done":hasHistory?"next":"later"}
            ].map(({label,detail,icon:Icon,state},i)=><div key={label} className={`relative rounded-2xl border p-4 ${state==="done"?"border-[#BFE3D5] bg-[#EEF9F3]":state==="next"?"border-[#C3D0FC] bg-[#F1F4FF]":"border-[#E4E8F0] bg-[#F8F9FC]"}`}><div className="mb-4 flex items-center justify-between"><span className="text-xs font-bold text-[#8898B2]">0{i+1}</span><Icon size={19} className={state==="done"?"text-[#229676]":state==="next"?"text-[#3C5BCA]":"text-[#A2ADC1]"}/></div><h3 className="text-sm font-bold">{label}</h3><p className="mt-2 text-xs leading-5 text-[#6A7992]">{detail}</p></div>)}
           </div>
          </motion.section>

          <motion.section {...motionIn(.29)} className={panel+" p-6 sm:p-7"}>
           <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Vos axes de progression</h2><GraduationCap size={21} className="text-[#6E60C9]"/></div>
           <p className="mt-2 text-xs leading-6 text-[#687993]">Choisis lors de votre onboarding, ils seront proposés par défaut dans vos simulations.</p>
           <div className="mt-5 grid gap-3 sm:grid-cols-2">{profile.preparationGoals.map((key,i)=>{const tone=skillTones[i%skillTones.length];return <div key={key} className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 ${tone.border} ${tone.bg}`}><span className={`grid size-9 place-items-center rounded-xl bg-white/75 text-sm font-bold ${tone.ink}`}>{String(i+1).padStart(2,"0")}</span><span className="flex-1 text-sm font-semibold text-[#26334E]">{priorityNames[key]}</span><Check size={16} className={tone.ink}/></div>;})}</div>
          </motion.section>
         </div>

         <div className="space-y-4">
          <motion.section {...motionIn(.12)} className={panel+" p-6"}>
           <div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-[#E5DFFF] text-[#7258C4]"><BrainCircuit size={19}/></span><div><h2 className="text-base font-bold">Votre coach IA</h2><p className="text-[11px] text-[#8B91A5]">Accompagnement personnalisé</p></div></div>
           <div className="mt-5 rounded-2xl bg-[linear-gradient(135deg,#F4EDFF,#EDF1FF)] p-5"><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-bold text-[#7456BA]"><Sparkles size={14}/> {coach?"Recommandation personnalisée":"Votre prochaine étape"}</div><h3 className="text-base font-bold leading-6">{coach?.coach_priority??"Commencez par une simulation."}</h3><p className="mt-3 text-xs leading-6 text-[#626D8A]">{coach?.coach_recommendation??(hasHistory?"Vos conseils personnalisés apparaîtront après l’analyse de vos réponses.":"Votre coach analysera vos réponses pour identifier vos points forts et les compétences à développer.")}</p></div>
          </motion.section>
          <motion.section {...motionIn(.2)} className={panel+" p-6"}>
           <div className="flex items-center justify-between"><h2 className="text-base font-bold">Score de préparation</h2><Target size={19} className="text-[#3C68C9]"/></div>
           <div className="mt-5"><InterviewScoreGauge score={trend.score}/></div>
          </motion.section>
          <motion.section {...motionIn(.27)} className={panel+" p-6"}>
           <div className="flex items-center justify-between"><h2 className="text-base font-bold">Votre profil</h2><UserRound size={19} className="text-[#5971C7]"/></div>
           <p className="mt-4 text-lg font-bold">{profile.firstName} {profile.lastName}</p>
           {situation&&<p className="mt-1 text-xs leading-5 text-[#76849C]">{situation}</p>}
           <div className="mt-5 rounded-xl bg-[#F2F5FF] p-4"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#6D78B0]">Objectif principal</p><p className="mt-2 text-sm font-semibold leading-6">{goalNames[profile.professionalGoal]}</p></div>
           <Link href="/onboarding" className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#3656C3] hover:underline">Consulter mon profil <ArrowRight size={16}/></Link>
          </motion.section>
          
         </div>
        </div>
        {hasHistory&&<motion.section {...motionIn(.34)} className={panel+" mt-5 p-6 sm:p-7"}>
         <h2 className="text-lg font-bold">Historique des entretiens</h2>
         <p className="mt-1 text-xs leading-6 text-[#73819A]">Vos dernières séances, sans notes inventées.</p>
         <div className="mt-4 divide-y divide-[#E5EAF4]">{results.slice(0,5).map(r=><div key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="text-sm font-bold">{r.interview_kind==="rh"?"Entretien RH":"Entretien technique"}{r.job_title?` · ${r.job_title}`:""}</p><p className="mt-1 text-xs text-[#6D7D98]">{new Date(r.completed_at).toLocaleDateString("fr-FR")} · {r.status==="partial"?"Bilan partiel":"Terminé"}</p></div><span className="rounded-xl bg-[#EFF3FC] px-3 py-2 text-xs font-semibold text-[#5267A0]">{r.score===null?"Non noté":`${r.score}/100`}</span></div>)}</div>
        </motion.section>}
        <p className="mt-8 flex items-center gap-2 text-xs leading-6 text-[#8390A6]"><BookOpen size={15}/> Données réelles uniquement : les résultats et l’historique apparaîtront après intégration des simulations.</p>
       </>}
     </div>
    </div>
   </div>
 </main>;
}
