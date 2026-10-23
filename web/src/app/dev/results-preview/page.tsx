import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeCheck, BrainCircuit, CalendarDays, CheckCircle2, Dumbbell, MessageSquareQuote, Sparkles, Target, TrendingUp, TriangleAlert } from "lucide-react";

const skills = [
  {name:"Clarté et communication", score:86,detail:"Un discours facile à suivre, avec des exemples concrets."},
  {name:"Structure des réponses",score:72,detail:"Les idées sont pertinentes mais la conclusion manque parfois."},
  {name:"Pertinence des exemples",score:81,detail:"Des expériences bien choisies et proches du poste ciblé."},
  {name:"Confiance et posture",score:78,detail:"Une bonne assurance générale, avec quelques hésitations."},
  {name:"Argumentation métier",score:65,detail:"Des résultats et indicateurs à préciser davantage."},
];
export default function ResultsPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <main className="min-h-dvh bg-[#F8F9FF] pb-20 text-[#202744]">
    <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_at_70%_0%,#F5D9F4_0%,#E7E8FF_45%,transparent_82%)]" aria-hidden="true"/>
    <div className="relative mx-auto max-w-[1150px] px-5 pt-8 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/dev/analysis-preview" className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[#DDD8EF] bg-white/80 px-4 text-sm font-semibold text-[#566184]"><ArrowLeft size={16}/> Vue d’analyse</Link>
        <span className="rounded-full border border-[#EFCCCD] bg-[#FFF0EF] px-4 py-2 text-xs font-extrabold tracking-wide text-[#B54E65]">DÉMO · DONNÉES FICTIVES</span>
      </header>
      <div className="mt-11">
        <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#8357D9]">Votre bilan d’entretien</p>
        <h1 className="mt-3 text-[clamp(2.2rem,5vw,3.8rem)] font-extrabold leading-[1.08] tracking-[-.055em]">Une belle base.<br/><span className="bg-gradient-to-r from-[#5365FF] via-[#9156EF] to-[#DD4FC0] bg-clip-text text-transparent">Et encore du potentiel.</span></h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#65718E]">Voici un exemple complet du bilan que pourrait recevoir un candidat. Tous les scores et commentaires de cet écran sont inventés pour tester l’expérience utilisateur.</p>
      </div>
      <div className="mt-9 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <section className="rounded-[30px] border border-white bg-white/85 p-7 shadow-[0_20px_65px_rgba(93,80,161,.10)] backdrop-blur-lg sm:p-9">
          <div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-[#EAF9F4] px-3 py-1.5 text-xs font-bold text-[#16836A]"><CheckCircle2 className="mr-1 inline" size={15}/> Entretien terminé</span><span className="text-xs text-[#8490A7]">Simulation RH · Talent Acquisition Lead · Français</span></div>
          <div className="mt-7 flex flex-wrap items-center gap-7">
            <div className="relative grid size-40 shrink-0 place-items-center rounded-full bg-[conic-gradient(#8256EA_0_78%,#E8E7F5_78%_100%)] p-3">
              <div className="grid size-full place-items-center rounded-full bg-white"><div className="text-center"><div className="text-5xl font-extrabold tracking-[-.06em]">78<span className="text-xl text-[#7B83A1]">/100</span></div><div className="mt-1 text-xs text-[#697791]">Score global</div></div></div>
            </div>
            <div className="min-w-0 flex-1"><span className="text-xs font-bold uppercase tracking-[.13em] text-[#8260CE]">Niveau de préparation</span><h2 className="mt-2 text-2xl font-extrabold">Bon niveau</h2><p className="mt-3 text-sm leading-7 text-[#64708B]">Vos réponses sont convaincantes et structurées dans l’ensemble. Pour aller plus loin, appuyez vos réalisations sur des indicateurs précis et terminez chaque exemple par son impact.</p></div>
          </div>
          <div className="mt-7 grid gap-3 border-t border-[#EBEAF5] pt-6 sm:grid-cols-3">
            <div><p className="text-xs text-[#8290A5]">Type</p><p className="mt-1 text-sm font-bold">Entretien RH</p></div><div><p className="text-xs text-[#8290A5]">Durée simulée</p><p className="mt-1 text-sm font-bold">20 minutes</p></div><div><p className="text-xs text-[#8290A5]">Questions</p><p className="mt-1 text-sm font-bold">6 réponses</p></div>
          </div>
        </section>
        <section className="rounded-[30px] border border-[#E1D7FB] bg-gradient-to-br from-[#F3EDFF] via-[#F6EEFF] to-[#FCEAF7] p-7 sm:p-9">
          <div className="flex items-center gap-2 text-sm font-extrabold text-[#7451CE]"><BrainCircuit size={21}/> Le regard de votre coach IA</div>
          <h2 className="mt-7 text-2xl font-extrabold leading-tight">Vous savez expliquer ce que vous faites. Montrez davantage ce que cela change.</h2>
          <p className="mt-5 text-sm leading-7 text-[#625E86]">Votre levier prioritaire : donner plus de poids à vos exemples professionnels en précisant le contexte, votre action, puis un résultat mesurable.</p>
          <div className="mt-7 rounded-2xl border border-white/80 bg-white/70 p-4 text-sm leading-6 text-[#614F93]"><Sparkles size={17} className="mr-2 inline"/> Conseil : préparez deux réalisations chiffrées avant votre prochain entretien.</div>
        </section>
      </div>
      <section className="mt-6 rounded-[30px] border border-white bg-white/85 p-7 shadow-[0_15px_48px_rgba(93,80,161,.07)] sm:p-9">
        <div className="flex items-center gap-3"><Target className="text-[#8557E6]" size={23}/><div><h2 className="text-xl font-extrabold">Vos compétences en détail</h2><p className="mt-1 text-xs text-[#74819C]">Évaluation illustrative par dimension</p></div></div>
        <div className="mt-8 grid gap-x-10 gap-y-7 md:grid-cols-2">{skills.map(s=><div key={s.name}><div className="flex items-center justify-between gap-3 text-sm"><strong>{s.name}</strong><span className="font-extrabold text-[#7652D1]">{s.score}/100</span></div><div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#ECEAFA]"><div className="h-full rounded-full bg-gradient-to-r from-[#5670F7] via-[#9862F0] to-[#DA78CD]" style={{width:s.score+"%"}}/></div><p className="mt-2 text-xs leading-5 text-[#77829A]">{s.detail}</p></div>)}</div>
      </section>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <section className="rounded-[28px] border border-[#D5EDE5] bg-[#F1FCF7] p-7"><h2 className="flex items-center gap-2 text-lg font-extrabold text-[#167C69]"><BadgeCheck size={21}/> Vos points forts</h2><ul className="mt-5 space-y-4 text-sm leading-6 text-[#3D655D]"><li>• Présentation de votre parcours claire et cohérente.</li><li>• Exemples de collaboration et de résolution de problèmes pertinents.</li><li>• Ton professionnel et capacité à reformuler les questions.</li></ul></section>
        <section className="rounded-[28px] border border-[#F5D6E8] bg-[#FFF3F9] p-7"><h2 className="flex items-center gap-2 text-lg font-extrabold text-[#B84B8D]"><TriangleAlert size={21}/> Axes d’amélioration</h2><ul className="mt-5 space-y-4 text-sm leading-6 text-[#825E74]"><li>• Quantifier les résultats obtenus dans vos projets.</li><li>• Structurer plus systématiquement les réponses avec la méthode STAR.</li><li>• Conclure en reliant chaque exemple au poste visé.</li></ul></section>
      </div>
      <section className="mt-6 rounded-[30px] border border-white bg-white/85 p-7 sm:p-9">
        <h2 className="flex items-center gap-2 text-xl font-extrabold"><MessageSquareQuote size={22} className="text-[#865CE0]"/> Retour sur une réponse</h2>
        <p className="mt-3 text-xs font-bold uppercase tracking-[.11em] text-[#8A6AD2]">Question 03 · Exemple fictif</p>
        <p className="mt-3 text-lg font-bold">« Parlez-moi d’une situation où vous avez dû convaincre un interlocuteur difficile. »</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2"><div className="rounded-2xl bg-[#F6F7FD] p-5"><p className="text-xs font-bold text-[#75819E]">Extrait de réponse simulée</p><p className="mt-3 text-sm leading-7 text-[#586681]">« J’ai rencontré des résistances sur un nouveau processus de recrutement. J’ai organisé des échanges et accompagné les managers pour faciliter son adoption. »</p></div><div className="rounded-2xl bg-[#F2EDFF] p-5"><p className="text-xs font-bold text-[#8050D9]">Comment l’améliorer</p><p className="mt-3 text-sm leading-7 text-[#63557B]">Précisez le problème initial, les actions personnelles et surtout l’impact : délai réduit, taux d’adoption ou satisfaction des managers.</p></div></div>
      </section>
      <section className="mt-6 rounded-[30px] border border-[#DAD4FB] bg-gradient-to-r from-[#EFEDFF] via-[#F6ECFF] to-[#FCEAF7] p-7 sm:p-9"><h2 className="flex items-center gap-2 text-xl font-extrabold"><TrendingUp size={22} className="text-[#8255DF]"/> Votre plan de progression</h2><div className="mt-6 grid gap-3 md:grid-cols-3">{[{n:"01",t:"Préparer vos exemples",d:"Deux réussites concrètes avec un résultat mesurable."},{n:"02",t:"Structurer avec STAR",d:"Situation, tâche, action, résultat : entraînez-vous à suivre ce fil."},{n:"03",t:"Refaire une simulation",d:"Concentrez-vous sur la structure et l’impact de vos réponses."}].map(i=><div key={i.n} className="rounded-2xl border border-white bg-white/75 p-5"><span className="text-xs font-extrabold text-[#8856E5]">{i.n}</span><h3 className="mt-3 text-sm font-extrabold">{i.t}</h3><p className="mt-2 text-xs leading-6 text-[#65718A]">{i.d}</p></div>)}</div></section>
      <section aria-labelledby="next-steps-title" className="relative mt-7 overflow-hidden rounded-[32px] border border-[#DFD5FC] bg-white/85 p-6 shadow-[0_18px_65px_rgba(105,85,190,.11)] sm:p-9">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-36 size-80 rounded-full bg-[#F3D7FF]/55 blur-[80px]"/>
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#F1EBFF] px-4 py-2 text-xs font-extrabold text-[#8256E5]"><Sparkles size={15}/> La suite de votre parcours</span>
          <h2 id="next-steps-title" className="mt-5 text-[clamp(1.6rem,3.5vw,2.3rem)] font-extrabold tracking-[-.045em]">Votre progression ne s’arrête pas au bilan.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#64718D]">Transformez vos axes d’amélioration en actions. Vous pourrez choisir un accompagnement humain ou travailler à votre rythme avec des exercices ciblés.</p>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <article className="flex flex-col rounded-[25px] border border-[#DED4F8] bg-gradient-to-br from-[#F0ECFF] to-[#FCEFFC] p-6 sm:p-7">
              <span className="grid size-12 place-items-center rounded-2xl bg-white/85 text-[#8053DA] shadow-[0_6px_25px_rgba(110,84,187,.1)]"><CalendarDays size={23}/></span>
              <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[.14em] text-[#8156D6]">Accompagnement individuel</p>
              <h3 className="mt-2 text-xl font-extrabold">Échangez avec un expert</h3>
              <p className="mt-3 flex-1 text-sm leading-7 text-[#655D80]">Un entretien en one-to-one pour revenir sur vos réponses, obtenir des conseils personnalisés et préparer votre prochaine échéance.</p>
              <span className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-[#8465B2]"><span className="size-2 rounded-full bg-[#A280DA]"/> Réservation bientôt disponible</span>
              <span aria-disabled="true" className="mt-4 inline-flex min-h-12 cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-[#DED2F5] bg-white/75 px-5 text-sm font-bold text-[#8265AF]">Réserver un one-to-one <ArrowRight size={17}/></span>
            </article>
            <article className="flex flex-col rounded-[25px] border border-[#CCE5F4] bg-gradient-to-br from-[#E9F8FF] to-[#F1F0FF] p-6 sm:p-7">
              <span className="grid size-12 place-items-center rounded-2xl bg-white/85 text-[#4A75DB] shadow-[0_6px_25px_rgba(94,128,204,.1)]"><Dumbbell size={23}/></span>
              <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[.14em] text-[#4E6CCA]">Entraînement personnalisé</p>
              <h3 className="mt-2 text-xl font-extrabold">Travaillez vos compétences</h3>
              <p className="mt-3 flex-1 text-sm leading-7 text-[#5E6E8D]">Retrouvez bientôt des exercices courts par rubrique : méthode STAR, exemples chiffrés, communication et argumentation métier.</p>
              <span className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-[#5879B0]"><span className="size-2 rounded-full bg-[#68A6D9]"/> Rubriques d’entraînement à venir</span>
              <span aria-disabled="true" className="mt-4 inline-flex min-h-12 cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-[#CDDEEF] bg-white/75 px-5 text-sm font-bold text-[#577EAD]">Explorer mes entraînements <ArrowRight size={17}/></span>
            </article>
          </div>
          <p className="mt-5 text-xs leading-6 text-[#8A8FAA]">Ces deux parcours sont présentés ici pour valider l’expérience. Ils ne permettent pas encore de réserver ni de démarrer un exercice.</p>
        </div>
      </section>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4"><p className="max-w-xl text-xs leading-6 text-[#9B6C84]">Prototype UX uniquement. Ce bilan fictif ne provient pas du moteur IA, n’est pas enregistré dans Supabase et ne doit pas être présenté comme une évaluation réelle.</p><Link href="/dev/analysis-preview" className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-[#5365FF] via-[#8755F4] to-[#DF4DC5] px-6 text-sm font-bold text-white shadow-[0_12px_26px_rgba(113,89,233,.24)]">Revoir la transition <ArrowRight size={17}/></Link></div>
    </div>
  </main>;
}
