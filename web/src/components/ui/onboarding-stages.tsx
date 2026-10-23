"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, BriefcaseBusiness, Check, ChevronRight, Compass, Languages, ShieldCheck, Sparkles, Target, TrendingUp, UserRound } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { WelcomeSequence } from "./welcome-sequence";

export type ProfessionalGoal = "first_job" | "internship" | "job_change" | "career_growth" | "return_to_work" | "employment_transition" | "client_pitches";
export type PreparationGoal = "confidence" | "answer_structure" | "communication" | "domain_knowledge" | "stress_management";
export type Locale = "fr" | "en";
export type EmploymentStatus = "student" | "employed" | "looking" | "independent";
export type ExperienceLevel = "starting" | "junior" | "experienced" | "senior";
export type OnboardingProfile = {
  firstName: string;
  lastName: string;
  professionalGoal: ProfessionalGoal;
  employmentStatus?: EmploymentStatus;
  experienceLevel?: ExperienceLevel;
  preparationGoals: PreparationGoal[];
  preferredLocale: Locale;
};

type Props = {
  className?: string;
  onComplete?: (profile: OnboardingProfile) => void | Promise<void>;
  initialProfile?: Partial<OnboardingProfile>;
  enableAnimations?: boolean;
};

export const professionalOptions: { value: ProfessionalGoal; title: string; detail: string; icon: typeof Target }[] = [
  { value: "first_job", title: "Préparer mon premier emploi", detail: "On va valoriser votre potentiel, vos projets et vos premières expériences.", icon: Compass },
  { value: "internship", title: "Réussir un entretien de stage ou d’alternance", detail: "On va apprendre à présenter vos projets, vos motivations et vos envies.", icon: Compass },
  { value: "job_change", title: "Changer de poste", detail: "On prépare la manière de raconter votre expérience et vos nouvelles ambitions.", icon: BriefcaseBusiness },
  { value: "career_growth", title: "Évoluer dans ma carrière", detail: "On va mettre en valeur votre parcours pour préparer plus de responsabilités.", icon: TrendingUp },
  { value: "return_to_work", title: "Retrouver un emploi", detail: "On va préparer les entretiens et expliquer votre parcours avec confiance.", icon: Target },
  { value: "employment_transition", title: "Rejoindre une entreprise", detail: "On va présenter vos projets indépendants comme une vraie force.", icon: BriefcaseBusiness },
  { value: "client_pitches", title: "Convaincre de nouveaux clients", detail: "On s’entraîne à présenter votre expertise et à défendre vos propositions.", icon: Target },
];

export function goalsForContext(status?: EmploymentStatus, experience?: ExperienceLevel): ProfessionalGoal[] {
  switch (status) {
    case "student": return ["first_job", "internship"];
    case "employed": return ["job_change", "career_growth"];
    case "looking": return experience === "starting" ? ["first_job", "return_to_work"] : ["return_to_work", "job_change"];
    case "independent": return ["employment_transition", "client_pitches"];
    default: return [];
  }
}

export const employmentOptions: { value: EmploymentStatus; title: string; detail: string }[] = [
  { value: "student", title: "Je termine mes études ou je débute", detail: "Un premier poste, un stage ou le début de notre parcours." },
  { value: "employed", title: "Je suis en poste", detail: "On prépare le prochain défi à partir de votre expérience." },
  { value: "looking", title: "Je recherche un emploi", detail: "On va s'entraîner pour aborder les prochains échanges avec confiance." },
  { value: "independent", title: "Je travaille à mon compte", detail: "On mettra en valeur votre autonomie et vos projets." },
];

export const experienceOptions: { value: ExperienceLevel; title: string }[] = [
  { value: "starting", title: "Je débute" },
  { value: "junior", title: "1 à 3 ans" },
  { value: "experienced", title: "4 à 7 ans" },
  { value: "senior", title: "8 ans et plus" },
];

const preparationOptions: { value: PreparationGoal; title: string; detail: string }[] = [
  { value: "confidence", title: "Prendre confiance", detail: "Être plus à l’aise pour parler de moi et de mes réalisations." },
  { value: "answer_structure", title: "Donner des réponses plus claires", detail: "Organiser mes idées et illustrer mes réponses avec des exemples." },
  { value: "communication", title: "Mieux communiquer", detail: "M'exprimer naturellement, avec précision et conviction." },
  { value: "domain_knowledge", title: "Renforcer mes connaissances métier", detail: "Approfondir les sujets liés à mon domaine professionnel." },
  { value: "stress_management", title: "Mieux gérer la pression", detail: "Rester concentré, même face à une question inattendue." },
];

const steps = [
  { label: "Faisons connaissance", icon: UserRound },
  { label: "Notre point de départ", icon: Compass },
  { label: "Notre objectif", icon: Target },
  { label: "Nos priorités", icon: Sparkles },
  { label: "Notre langue", icon: Languages },
] as const;

const defaultProfile: OnboardingProfile = {
  firstName: "",
  lastName: "",
  professionalGoal: "first_job",
  employmentStatus: undefined,
  experienceLevel: undefined,
  preparationGoals: [],
  preferredLocale: "fr",
};

export function OnboardingStages({
  className,
  onComplete,
  initialProfile,
  enableAnimations = true,
}: Props) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const animated = enableAnimations && !reducedMotion;
  const [profile, setProfile] = useState<OnboardingProfile>({ ...defaultProfile, ...initialProfile });
  const [step, setStep] = useState(0);
  const [fieldError, setFieldError] = useState("");
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [returnToRecap, setReturnToRecap] = useState(false);
  const [direction, setDirection] = useState(1);
  const percent = finished ? 100 : Math.round(((step + 1) / steps.length) * 100);
  const firstName = profile.firstName.trim();
  const allowedGoals = goalsForContext(profile.employmentStatus, profile.experienceLevel);
  const selectedGoalValid = allowedGoals.includes(profile.professionalGoal);

  const canProceed = (step === 0 && firstName.length > 0 && profile.lastName.trim().length > 0) ||
    (step === 1 && Boolean(profile.employmentStatus)) ||
    (step === 2 && selectedGoalValid) ||
    (step === 3 && profile.preparationGoals.length > 0) ||
    step === 4;

  async function next() {
    if (!canProceed) {
      setFieldError(step === 0 ? "Indiquez votre prénom et votre nom pour continuer." :
        step === 1 ? "Choisissez votre situation actuelle." :
        step === 2 ? "Choisissez l’objectif qui correspond à votre situation." : "Sélectionnez au moins un axe de progression.");
      return;
    }
    if (step === steps.length - 1) {
      if (!selectedGoalValid) { setFieldError("Choisissez d’abord un objectif compatible avec votre situation."); return; }
      const completed = { ...profile, firstName, lastName: profile.lastName.trim() };
      setSaving(true);
      try {
        await onComplete?.(completed);
      } catch {
        setFieldError("L’enregistrement n’a pas fonctionné. Réessayons sans perdre vos réponses.");
        setSaving(false);
        return;
      }
      setSaving(false);
      setFinished(true);
      setReturnToRecap(false);
      return;
    }
    setFieldError("");
    if (returnToRecap) {
      setSaving(true);
      try {
        await onComplete?.({ ...profile, firstName, lastName: profile.lastName.trim() });
      } catch {
        setFieldError("Nous n’avons pas pu enregistrer cette modification. Réessayons.");
        setSaving(false);
        return;
      }
      setSaving(false);
      setFinished(true);
      setReturnToRecap(false);
    } else {
      setDirection(1);
      setStep((current) => current + 1);
    }
  }

  function toggleGoal(value: PreparationGoal) {
    setProfile((current) => ({
      ...current,
      preparationGoals: current.preparationGoals.includes(value)
        ? current.preparationGoals.filter((v) => v !== value)
        : current.preparationGoals.length < 3
          ? [...current.preparationGoals, value]
          : current.preparationGoals,
    }));
    setFieldError("");
  }

  function editStep(index: number) {
    setStep(index);
    setDirection(index < step ? -1 : 1);
    setFinished(false);
    setReturnToRecap(true);
    setFieldError("");
  }

  function openDashboard() {
    router.push("/dashboard");
  }

  function previous() {
    setDirection(-1);
    setFieldError("");
    if (returnToRecap) {
      setFinished(true);
      setReturnToRecap(false);
    } else {
      setStep((current) => Math.max(0, current - 1));
    }
  }

  const professionalLabel = professionalOptions.find((option) => option.value === profile.professionalGoal && selectedGoalValid)?.title ?? "";
  const preparationLabels = profile.preparationGoals.map((value) => preparationOptions.find((option) => option.value === value)?.title ?? value);

  if (finished) {
    return (
      <WelcomeSequence
        profile={profile}
        objective={professionalLabel}
        priorities={preparationLabels}
        onContinue={openDashboard}
        onPrevious={() => {
          setFinished(false);
          setReturnToRecap(false);
          setStep(steps.length - 1);
          setDirection(-1);
          setFieldError("");
        }}
      />
    );
  }


  return (
    <div className={cn("mx-auto w-full max-w-[1240px] px-5 pb-20 sm:px-8", className)}>
      <div className="flex flex-col gap-5">
        <div className="hidden">
        <aside className="relative overflow-hidden border-b border-[#3E5076] bg-[linear-gradient(160deg,#16284D,#1E315B_62%,#263C6B)] p-7 text-white backdrop-blur-2xl sm:p-9 lg:border-b-0 lg:border-r">
          <div aria-hidden="true" className="pointer-events-none absolute -right-32 top-24 h-80 w-80 rounded-full bg-[#5474CF]/15 blur-[85px]" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10">
                <Sparkles size={20} aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold tracking-wide">Notre espace de préparation</span>
            </div>
            <div className="mt-12 lg:mt-20">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#A6B8E4]">Notre parcours</p>
              <h2 className="mt-4 max-w-[260px] text-3xl font-semibold leading-tight tracking-[-0.04em]">
                Votre ambition, on la prépare ensemble.
              </h2>
              <p className="mt-4 max-w-[260px] text-sm leading-7 text-[#BAC4D6]">
                On apprend à vous connaître, puis on construit un entraînement qui vous aide vraiment à avancer.
              </p>
            </div>
            <ol className="mt-10 hidden space-y-1 lg:block" aria-label="Étapes de création du profil">
              {steps.map(({ label, icon: Icon }, index) => {
                const complete = finished || index < step;
                const active = !finished && index === step;
                return (
                  <li key={label} aria-current={active ? "step" : undefined}>
                    <button type="button" disabled={!finished && index > step} onClick={() => editStep(index)}
                      aria-label={`Modifier : ${label}`}
                      className={cn("flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors", active ? "bg-white/15 text-white" : "text-[#D1DAEE] hover:bg-white/10", !finished && index > step && "cursor-not-allowed opacity-50")}>
                      <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full border", complete ? "border-[#6DBEA8] bg-[#356D65] text-white" : active ? "border-white/50 bg-white/10" : "border-white/20")}>
                        {complete ? <Check size={16} aria-hidden="true" /> : <Icon size={16} aria-hidden="true" />}
                      </span>
                      {label}
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="mt-auto hidden items-center gap-2 pt-12 text-xs text-[#AEB8CC] lg:flex">
              <ShieldCheck size={15} aria-hidden="true" />
              On pourra ajuster ces choix ensemble.
            </div>
          </div>
        </aside>
        </div>

        <div className="pb-5 pt-4 text-[#172033]">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#3656A1]">Votre parcours prend forme</p>
          <h1 className="mt-3 text-[clamp(2rem,4vw,3.8rem)] font-semibold leading-tight tracking-[-.055em]">
            {firstName ? `Construisons votre profil, ${firstName}.` : "Faisons connaissance."}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#526688]">Chaque réponse enrichit votre profil. Vous pouvez revenir sur les étapes précédentes à tout moment.</p>
          <div className="mt-7 flex items-center gap-3 text-xs text-[#526688]">
            <span className="font-bold text-[#172033]">{step + 1} / {steps.length}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#CBD6EF]"><motion.div animate={{width:`${percent}%`}} transition={{duration:.55}} className="h-full rounded-full bg-[#779BFF]"/></div>
            <span>{percent}%</span>
          </div>
        </div>

        {step > 0 && <div className="relative space-y-3 border-l-2 border-[#B4C6E9] pb-1 pl-5 sm:pl-8">
          {Array.from({length:step},(_,i) => {
            const summaries = [
              {title:"Faisons connaissance",text:`Bonjour ${profile.firstName} ${profile.lastName}.`},
              {title:"Votre point de départ",text:[employmentOptions.find(x=>x.value===profile.employmentStatus)?.title,experienceOptions.find(x=>x.value===profile.experienceLevel)?.title].filter(Boolean).join(" · ")},
              {title:"Votre objectif",text:professionalLabel},
              {title:"Vos priorités",text:preparationLabels.join(" · ")},
            ];
            const item = summaries[i];
            return <motion.div key={i} layout initial={animated?{opacity:0,y:12}:false} animate={{opacity:1,y:0}} className="relative flex items-center justify-between gap-4 rounded-2xl border border-[#B3C6EF] bg-white/70 px-5 py-4 text-[#172033] shadow-[0_12px_30px_rgba(3,9,29,.15)] sm:px-7">
              <span className="absolute -left-[30px] grid h-4 w-4 place-items-center rounded-full bg-[#79C6B2] text-[#0B1B30] sm:-left-[42px]"><Check size={11}/></span>
              <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#3656A1]">Étape {i+1} · {item.title}</p><p className="mt-2 break-words text-base font-semibold leading-6">{item.text}</p></div>
              <button type="button" onClick={()=>{setDirection(-1);setStep(i);setFieldError("");}} className="shrink-0 rounded-xl border border-[#B7C9EA] px-3 py-2 text-xs font-semibold text-[#2947A3] transition hover:bg-[#E5ECFC]">Modifier</button>
            </motion.div>;
          })}
        </div>}

        <section className="relative flex min-w-0 flex-col overflow-hidden rounded-[24px] border border-[#B9C9EC] bg-white/70 px-6 py-9 text-[#172033] shadow-[0_22px_75px_rgba(3,11,30,.25)] sm:px-12 sm:py-12 lg:px-16" aria-label="Onboarding personnalisé">
          {!finished ? (
            <>
              <div className="flex items-center justify-between gap-5">
                <span className="text-sm font-medium text-[#526079]">Étape {step + 1} sur {steps.length}</span>
                <span className="text-sm font-semibold tabular-nums text-[#2947A3]">{percent}%</span>
              </div>
              <div className="mt-4 flex items-center gap-2" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={steps.length} aria-label="Progression de notre parcours">
                {steps.map((item, index) => (
                  <div key={item.label} className="relative h-[7px] min-w-0 flex-1 overflow-hidden rounded-full bg-[#DFE5F5]" aria-hidden="true">
                    <motion.div className="absolute inset-y-0 left-0 rounded-full bg-[#4762DB]" initial={false}
                      animate={{ width: index < step ? "100%" : index === step ? "34%" : "0%" }}
                      transition={{ duration: animated ? 0.35 : 0, ease: "easeOut" }} />
                  </div>
                ))}
              </div>
              <div className="mt-8 sm:mt-9">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={step} initial={animated ? { opacity: 0, x: direction * 38, filter: "blur(5px)" } : false}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    exit={animated ? { opacity: 0, x: direction * -28, filter: "blur(5px)" } : { opacity: 1 }}
                    transition={{ duration: animated ? 0.4 : 0, ease: [0.2, 0.8, 0.2, 1] }}>
                    {step === 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2947A3]">On fait connaissance ?</p>
                        <h1 className="mt-4 text-[30px] font-semibold leading-tight tracking-[-0.04em] text-[#172033] sm:text-[39px]">D’abord, vous.</h1>
                        <p className="mt-4 max-w-xl text-base leading-7 text-[#526079]">On va passer un peu de temps ensemble. Autant commencer par votre prénom, non ?</p>
                        <div className="mt-9 grid gap-5 sm:grid-cols-2">
                          <label className="block text-sm font-medium text-[#172033]">Prénom
                            <input autoComplete="given-name" value={profile.firstName} maxLength={80}
                              onChange={(e) => setProfile((v) => ({ ...v, firstName: e.target.value }))} placeholder="Votre prénom"
                              className="mt-2 block min-h-12 w-full rounded-xl border border-[#D7DFEA] bg-white px-4 text-base outline-none transition focus:border-[#2947A3] focus:ring-2 focus:ring-[#2947A3]/15" />
                          </label>
                          <label className="block text-sm font-medium text-[#172033]">Nom
                            <input autoComplete="family-name" value={profile.lastName} maxLength={80}
                              onChange={(e) => setProfile((v) => ({ ...v, lastName: e.target.value }))} placeholder="Votre nom"
                              className="mt-2 block min-h-12 w-full rounded-xl border border-[#D7DFEA] bg-white px-4 text-base outline-none transition focus:border-[#2947A3] focus:ring-2 focus:ring-[#2947A3]/15" />
                          </label>
                        </div>
                      </div>
                    )}
                    {step === 1 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2947A3]">Notre point de départ</p>
                        <h1 className="mt-4 text-[30px] font-semibold leading-tight tracking-[-0.04em] text-[#172033] sm:text-[39px]">Aujourd’hui, où en êtes-vous ?</h1>
                        <p className="mt-3 text-sm leading-7 text-[#526079]">On va adapter les entretiens à votre situation et à votre expérience.</p>
                        <div role="radiogroup" aria-label="Situation professionnelle actuelle" className="mt-6 grid gap-2 sm:grid-cols-2">
                          {employmentOptions.map(({ value, title, detail }) => {
                            const selected = profile.employmentStatus === value;
                            return <button key={value} type="button" role="radio" aria-checked={selected}
                              onClick={() => setProfile((current) => ({
                                ...current, employmentStatus: value,
                                experienceLevel: value === "student" ? "starting" : current.employmentStatus === "student" ? undefined : current.experienceLevel,
                                professionalGoal: goalsForContext(value, value === "student" ? "starting" : current.experienceLevel).includes(current.professionalGoal)
                                  ? current.professionalGoal : goalsForContext(value, value === "student" ? "starting" : current.experienceLevel)[0],
                              }))}
                              className={cn("rounded-2xl border p-4 text-left transition hover:border-[#7590D1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2947A3]", selected ? "border-[#2947A3] bg-[#F3F6FE]" : "border-[#E0E6EF] bg-white/65")}>
                              <span className="flex items-start justify-between gap-2 text-sm font-semibold text-[#172033]">{title}{selected && <Check size={17} className="shrink-0 text-[#2947A3]" aria-hidden="true" />}</span>
                              <span className="mt-2 block text-xs leading-5 text-[#526079]">{detail}</span>
                            </button>;
                          })}
                        </div>
                        <div className="mt-7 border-t border-[#E6EBF3] pt-5">
                          <h2 className="text-base font-semibold text-[#172033]">Et côté expérience ? <span className="text-sm font-normal text-[#6B7890]">(facultatif)</span></h2>
                          <p className="mt-1 text-sm text-[#526079]">Pour ajuster la difficulté. On peut aussi voir ça plus tard.</p>
                          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Expérience professionnelle">
                            {experienceOptions.filter(({ value }) => profile.employmentStatus !== "student" || value === "starting").map(({ value, title }) => {
                              const selected = profile.experienceLevel === value;
                              return <button type="button" role="radio" aria-checked={selected} key={value}
                                onClick={() => setProfile((p) => ({
                                  ...p, experienceLevel: value,
                                  professionalGoal: goalsForContext(p.employmentStatus, value).includes(p.professionalGoal)
                                    ? p.professionalGoal : goalsForContext(p.employmentStatus, value)[0],
                                }))}
                                className={cn("min-h-12 rounded-xl border px-2 py-3 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2947A3]", selected ? "border-[#2947A3] bg-[#F3F6FE] text-[#2947A3]" : "border-[#E0E6EF] bg-white/65 text-[#526079] hover:border-[#7590D1]")}>{title}</button>;
                            })}
                          </div>
                          {profile.experienceLevel && profile.employmentStatus !== "student" && <button type="button" onClick={() => setProfile((p) => ({ ...p, experienceLevel: undefined }))} className="mt-2 min-h-9 text-xs font-medium text-[#526079] underline-offset-2 hover:underline">Je préfère préciser plus tard</button>}
                        </div>
                      </div>
                    )}
                    {step === 2 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2947A3]">Notre prochaine étape</p>
                        <h1 className="mt-4 text-[30px] font-semibold leading-tight tracking-[-0.04em] text-[#172033] sm:text-[39px]">{firstName ? `${firstName}, on vise quoi ensuite ?` : "On vise quoi ensuite ?"}</h1>
                        <p className="mt-4 text-base leading-7 text-[#526079]">Selon votre point de départ, voici les objectifs qu’on peut préparer ensemble.</p>
                        <div className="mt-8 space-y-3" role="radiogroup" aria-label="Objectif professionnel principal">
                          {professionalOptions.filter(({ value }) => allowedGoals.includes(value)).map(({ value, title, detail, icon: Icon }) => {
                            const selected = profile.professionalGoal === value;
                            return <button key={value} type="button" role="radio" aria-checked={selected}
                              onClick={() => setProfile((p) => ({ ...p, professionalGoal: value }))}
                              className={cn("flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition hover:border-[#7590D1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2947A3]", selected ? "border-[#2947A3] bg-[#F3F6FE]" : "border-[#E0E6EF]")}>
                              <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", selected ? "bg-[#2947A3] text-white" : "bg-[#EEF2F7] text-[#526079]")}><Icon size={20} aria-hidden="true" /></span>
                              <span className="flex-1"><span className="block text-[15px] font-semibold text-[#172033]">{title}</span><span className="mt-1 block text-sm leading-6 text-[#526079]">{detail}</span></span>
                              {selected && <Check className="mt-2 shrink-0 text-[#2947A3]" size={19} aria-hidden="true" />}
                            </button>;
                          })}
                        </div>
                      </div>
                    )}
                    {step === 3 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2947A3]">Ce qu’on va travailler ensemble</p>
                        <h1 className="mt-4 text-[30px] font-semibold leading-tight tracking-[-0.04em] text-[#172033] sm:text-[39px]">Qu’est-ce qu’on peut améliorer ensemble ?</h1>
                        <p className="mt-4 text-base leading-7 text-[#526079]">Choisissez jusqu’à trois points à travailler. On les utilisera pour adapter vos entraînements, et vous pourrez les changer.</p>
                        <div className="mt-8 grid gap-3 sm:grid-cols-2">
                          {preparationOptions.map(({ value, title, detail }) => {
                            const selected = profile.preparationGoals.includes(value);
                            const disabled = !selected && profile.preparationGoals.length >= 3;
                            return <button key={value} type="button" aria-pressed={selected} disabled={disabled}
                              onClick={() => toggleGoal(value)}
                              className={cn("min-h-28 rounded-2xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2947A3]", selected ? "border-[#2947A3] bg-[#F3F6FE]" : "border-[#E0E6EF] hover:border-[#7590D1]", disabled && "cursor-not-allowed opacity-45")}>
                              <span className="flex items-center justify-between gap-2 text-sm font-semibold text-[#172033]">{title}<span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full border", selected ? "border-[#2947A3] bg-[#2947A3] text-white" : "border-[#D1DAE7]")}>{selected && <Check size={14} aria-hidden="true" />}</span></span>
                              <span className="mt-2 block text-sm leading-6 text-[#526079]">{detail}</span>
                            </button>;
                          })}
                        </div>
                        <p className="mt-4 text-sm text-[#526079]">{profile.preparationGoals.length}/3 priorités sélectionnées</p>
                      </div>
                    )}
                    {step === 4 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2947A3]">On y est presque</p>
                        <h1 className="mt-4 text-[30px] font-semibold leading-tight tracking-[-0.04em] text-[#172033] sm:text-[39px]">Dans quelle langue on s’entraîne ?</h1>
                        <p className="mt-4 max-w-lg text-base leading-7 text-[#526079]">Choisissez votre langue pour commencer. On pourra en changer avant chaque entretien.</p>
                        <div className="mt-10 grid gap-4 sm:grid-cols-2" role="radiogroup" aria-label="Langue préférée">
                          {([{ value: "fr", title: "Français", subtitle: "Préparer mes entretiens en français" }, { value: "en", title: "English", subtitle: "Practice my interviews in English" }] as const).map((item) => {
                            const selected = profile.preferredLocale === item.value;
                            return <button key={item.value} type="button" role="radio" aria-checked={selected}
                              onClick={() => setProfile((p) => ({ ...p, preferredLocale: item.value }))}
                              className={cn("rounded-2xl border p-6 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2947A3]", selected ? "border-[#2947A3] bg-[#F3F6FE]" : "border-[#E0E6EF] hover:border-[#7590D1]")}>
                              <span className="flex items-center justify-between font-semibold text-[#172033]">{item.title}{selected && <Check size={19} className="text-[#2947A3]" aria-hidden="true" />}</span>
                              <span className="mt-2 block text-sm leading-6 text-[#526079]">{item.subtitle}</span>
                            </button>;
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="mt-10 border-t border-[#E8EDF5] pt-6">
                {fieldError && <p role="alert" className="mb-4 text-sm text-[#B42318]">{fieldError}</p>}
                <div className="flex items-center justify-between gap-4">
                  <button type="button" onClick={previous}
                    disabled={step === 0 && !returnToRecap} className="inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-[#526079] transition hover:bg-[#F1F4F9] disabled:cursor-not-allowed disabled:opacity-30">
                    <ArrowLeft size={17} aria-hidden="true" /> Retour
                  </button>
                  <button type="button" onClick={next} disabled={!canProceed || saving}
                    className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-[#2947A3] px-6 text-sm font-semibold text-white transition hover:bg-[#1E3586] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2947A3] disabled:cursor-not-allowed disabled:opacity-50">
                    {returnToRecap ? "Enregistrer et revenir" : step === steps.length - 1 ? "C’est parti !" : "Continuer"}
                    {step === steps.length - 1 ? <Check size={17} aria-hidden="true" /> : <ChevronRight size={17} aria-hidden="true" />}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
