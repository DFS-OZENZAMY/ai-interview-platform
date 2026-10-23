import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#172033]">
      <div className="relative overflow-hidden bg-[#0B1222] text-white">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 top-20 h-[450px] w-[450px] rounded-full bg-[#4664BC]/20 blur-[110px]" />
        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-7 sm:px-10">
          <Link href="/" className="flex items-center gap-3 text-sm font-semibold tracking-tight">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/20 bg-white/10"><Sparkles size={19} /></span>
            Interview Platform
          </Link>
          <div className="flex items-center gap-3"><Link href="/login" className="rounded-full px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10">Se connecter</Link><Link href="/login" className="rounded-full border border-white/25 px-5 py-2.5 text-sm font-medium transition hover:bg-white/10">Commencer <ArrowUpRight className="ml-1 inline h-4 w-4" /></Link></div>
        </header>
        <section className="relative mx-auto max-w-6xl px-5 pb-24 pt-16 sm:px-10 sm:pb-36 sm:pt-24">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A6B8E4]">Votre prochain entretien, on le prépare ensemble</p>
            <h1 className="mt-7 text-[clamp(2.6rem,6vw,5.6rem)] font-semibold leading-[1.05] tracking-[-0.06em]">Le bon entretien commence avant le jour J.</h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-[#C4CCDB]">Vous avez un objectif. Nous vous aidons à vous y préparer, avec des entretiens adaptés et des conseils concrets pour progresser.</p>
            <Link href="/login" className="mt-10 inline-flex min-h-13 items-center justify-center gap-3 rounded-xl bg-white px-7 py-4 text-sm font-semibold text-[#172033] transition hover:bg-[#E9EEF7] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              Commençons ensemble <ArrowUpRight size={18} />
            </Link>
          </div>
        </section>
      </div>
      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-16 sm:grid-cols-3 sm:px-10 sm:py-24">
        {[
          ["On fait le point", "On commence par comprendre votre objectif et ce que vous voulez améliorer."],
          ["On s’entraîne", "On prépare vos réponses avec des mises en situation RH ou techniques."],
          ["On progresse", "Après chaque séance, on identifie ensemble ce qui fonctionne et ce qu’on peut renforcer."],
        ].map(([title, description]) => (
          <div key={title} className="rounded-2xl border border-[#DFE5EE] bg-white p-7">
            <CheckCircle2 className="text-[#2947A3]" size={22} aria-hidden="true" />
            <h2 className="mt-5 text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-7 text-[#526079]">{description}</p>
          </div>
        ))}
      </section>
      <footer className="mx-auto max-w-6xl px-5 pb-10 text-xs text-[#78859B] sm:px-10">Prévisualisation du futur produit · L’entraînement ne constitue pas une décision de recrutement.</footer>
    </div>
  );
}
