import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, AudioLines, BrainCircuit, Check,
  ChevronRight, MessageCircleMore, MoveUpRight,
  Sparkles, Target, WandSparkles,
} from "lucide-react";

const stages = [
  { number: "01", icon: Target, title: "On fait connaissance", detail: "Votre projet, votre expérience, vos envies. On commence par ce qui compte pour vous.", tone: "violet" },
  { number: "02", icon: AudioLines, title: "On passe à la pratique", detail: "Un entretien vocal adapté à votre poste, à votre niveau et à vos objectifs.", tone: "blue" },
  { number: "03", icon: BrainCircuit, title: "On progresse ensemble", detail: "Un retour clair sur vos points forts et des conseils utiles pour la suite.", tone: "pink" },
] as const;

export default function Home() {
  return (
    <main className="landing-v2 relative min-h-screen overflow-hidden bg-[#F9FAFF] text-[#172041]">
      <div aria-hidden="true" className="landing-ambient pointer-events-none absolute inset-x-0 top-0 h-[960px] overflow-hidden">
        <div className="landing-ambient-a absolute -left-40 -top-32 h-[680px] w-[680px] rounded-full bg-[#DCE3FF]/75 blur-[100px]" />
        <div className="landing-ambient-b absolute -right-40 top-20 h-[650px] w-[650px] rounded-full bg-[#F5C9F6]/50 blur-[110px]" />
        <div className="landing-ambient-c absolute left-[35%] top-[370px] h-[520px] w-[520px] rounded-full bg-[#DAD0FF]/40 blur-[110px]" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-5 py-6 sm:px-10 lg:py-8">
        <Link href="/" aria-label="AI Interview Platform, accueil" className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[17px] bg-gradient-to-br from-[#5268FF] via-[#8A57FF] to-[#E454D5] text-white shadow-[0_8px_28px_rgba(128,92,255,.24)]"><Sparkles size={22} strokeWidth={2.1} /></span>
          <span className="flex flex-col leading-tight">
            <span className="text-[16px] font-extrabold tracking-[-.05em] sm:text-[18px]">Interview<span className="text-[#8250EF]">Lab</span></span>
            <span className="mt-0.5 text-[10px] font-semibold tracking-[.1em] text-[#7984A2]">VOTRE COACH D’ENTRETIEN IA</span>
          </span>
        </Link>
        <nav aria-label="Navigation principale" className="hidden items-center gap-8 text-sm font-semibold text-[#66718E] md:flex">
          <a href="#comment-ca-marche" className="transition-colors hover:text-[#7053E9]">Comment ça marche</a>
          <a href="#votre-coach" className="transition-colors hover:text-[#7053E9]">Votre coach</a>
        </nav>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link href="/login" className="rounded-full px-3 py-3 text-xs font-bold text-[#283458] transition-colors hover:text-[#7951E9] sm:px-5 sm:text-sm">Se connecter</Link>
          <Link href="/login" className="landing-primary-btn inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-xs font-bold text-white sm:px-6 sm:text-sm">Commencer <ArrowUpRight size={17}/></Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-[1240px] items-center gap-12 px-5 pb-20 pt-16 sm:px-10 md:pt-24 lg:grid-cols-[1.04fr_.96fr] lg:gap-8 lg:pb-32 lg:pt-28">
        <div className="landing-enter relative z-10 max-w-[690px]">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#CFC9FF]/70 bg-white/80 px-4 py-2 text-xs font-bold text-[#7859D9] shadow-[0_8px_30px_rgba(100,87,190,.08)] backdrop-blur-xl">
            <span className="relative flex h-2 w-2"><span className="absolute inset-0 animate-ping rounded-full bg-[#B66CFC]/45"/><span className="relative h-2 w-2 rounded-full bg-[#9B69FD]"/></span>
            Votre prochain entretien commence ici
            <ChevronRight size={14}/>
          </div>
          <h1 className="max-w-[720px] text-[clamp(3rem,5.35vw,5.3rem)] font-extrabold leading-[1.09] tracking-[-.072em] text-[#151D3C]">
            Moins de stress.
            <br />
            Plus de <span className="landing-gradient-text">confiance.</span>
            <br />
            <span className="landing-gradient-text">Plus de vous.</span>
          </h1>
          <p className="mt-8 max-w-[540px] text-[16px] leading-[1.85] text-[#63708D] sm:text-lg">
            Préparez vos entretiens comme vous les vivrez vraiment. Entraînez-vous à l’oral avec un coach IA, recevez des conseils personnalisés et progressez à votre rythme.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link href="/login" className="landing-primary-btn inline-flex min-h-[58px] items-center justify-center gap-3 rounded-2xl px-7 text-[15px] font-bold text-white">
              Je prépare mon entretien <ArrowRight size={19}/>
            </Link>
            <a href="#comment-ca-marche" className="inline-flex min-h-[54px] items-center gap-2 rounded-2xl border border-white/80 bg-white/75 px-6 text-sm font-bold text-[#35446B] shadow-[0_8px_35px_rgba(70,83,145,.07)] backdrop-blur-xl transition hover:border-[#D3CBFF] hover:bg-white">
              Découvrir comment ça marche <ArrowUpRight size={17}/>
            </a>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-semibold text-[#727D9A]">
            <span className="inline-flex items-center gap-2"><Check className="text-[#8256E9]" size={16}/> À votre rythme</span>
            <span className="inline-flex items-center gap-2"><Check className="text-[#8256E9]" size={16}/> Entretiens adaptés</span>
            <span className="inline-flex items-center gap-2"><Check className="text-[#8256E9]" size={16}/> Conseils concrets</span>
          </div>
        </div>

        <div id="votre-coach" className="landing-enter-delayed relative mx-auto w-full max-w-[610px] scroll-mt-28 py-8 lg:py-12">
          <div aria-hidden="true" className="landing-hero-glow absolute inset-x-[10%] bottom-[-2%] h-[55%] rounded-full bg-gradient-to-r from-[#9D77FF]/60 via-[#7E77FD]/45 to-[#F07BDB]/65 blur-[65px]" />
          <div aria-hidden="true" className="absolute -right-3 top-0 h-56 w-56 rounded-full border border-[#C6C6FB]/40 sm:-right-8" />
          <div aria-hidden="true" className="absolute -left-5 bottom-9 h-64 w-64 rounded-full border border-[#A7B3FA]/45 sm:-left-12" />
          <div className="landing-coach-card relative overflow-hidden rounded-[34px] border border-white/95 bg-white/70 p-6 shadow-[0_28px_90px_rgba(90,82,175,.15),inset_0_2px_0_rgba(255,255,255,.9)] backdrop-blur-2xl sm:p-9">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-[#506082]"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#EDE7FF] text-[#8157E7]"><WandSparkles size={17}/></span> Votre espace d’entraînement</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E7F8F2] px-3 py-1.5 text-[10px] font-bold text-[#278568]"><span className="h-1.5 w-1.5 rounded-full bg-[#3CCF98]"/> Coach IA</span>
            </div>
            <div className="relative mx-auto my-10 grid h-[230px] place-items-center sm:my-12 sm:h-[250px]">
              <div className="landing-orbit absolute h-[245px] w-[245px] rounded-full border border-[#A4A1FA]/25 sm:h-[270px] sm:w-[270px]"/>
              <div className="landing-orbit-reverse absolute h-[190px] w-[190px] rounded-full border border-[#DBB3FC]/40"/>
              <div className="landing-orb relative grid h-[162px] w-[162px] place-items-center rounded-full bg-[radial-gradient(circle_at_36%_29%,#E7D2FF_2%,#B4A1FF_33%,#6D6CF5_65%,#E56FDD_100%)] shadow-[0_10px_60px_rgba(126,93,246,.37),inset_0_0_30px_rgba(255,255,255,.65)]">
                <span className="absolute inset-4 rounded-full border border-white/40"/>
                <AudioLines size={64} className="text-white drop-shadow-[0_3px_14px_rgba(255,255,255,.85)]" strokeWidth={1.6}/>
              </div>
              <span className="absolute left-[13%] top-[14%] h-3 w-3 rounded-full bg-[#EF8FEC] shadow-[0_0_22px_#EF8FEC]"/>
              <span className="absolute bottom-[18%] right-[14%] h-2.5 w-2.5 rounded-full bg-[#777EFF] shadow-[0_0_22px_#777EFF]"/>
            </div>
            <div className="rounded-[22px] border border-[#E6E5F8] bg-white/80 p-5 shadow-[0_8px_30px_rgba(86,93,159,.055)]">
              <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.15em] text-[#8A78C8]"><MessageCircleMore size={15}/> Votre coach vous accompagne</p>
              <p className="text-[18px] font-bold leading-snug tracking-[-.03em] text-[#202C54] sm:text-[20px]">« Parlez-moi de votre parcours et de ce qui vous motive. »</p>
              <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
                {Array.from({length:27},(_,i)=><span key={i} className="landing-wave w-[3px] rounded-full bg-gradient-to-t from-[#5365FF] to-[#E870DB]" style={{height:`${9+((i*7)%24)}px`,animationDelay:`${(i%8)*-.13}s`}}/>)}
              </div>
            </div>
          </div>
          <div className="landing-floating-note absolute -bottom-1 -left-2 hidden items-center gap-3 rounded-2xl border border-white bg-white/95 px-4 py-3 shadow-[0_16px_42px_rgba(65,71,148,.15)] sm:flex">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#E9E5FF] text-[#7F5DE9]"><Sparkles size={18}/></span>
            <span className="text-xs font-bold text-[#344068]">Un entraînement<br/><span className="font-medium text-[#8B95AC]">qui vous ressemble</span></span>
          </div>
        </div>
      </section>

      <section id="comment-ca-marche" className="relative scroll-mt-20 border-t border-[#EDF0FC] bg-white/70 px-5 py-20 sm:px-10 lg:py-28">
        <div className="mx-auto max-w-[1160px]">
          <div className="mx-auto max-w-[630px] text-center">
            <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#8C5CF0]">Simple, humain, pensé pour vous</p>
            <h2 className="mt-4 text-[clamp(2rem,4vw,3.15rem)] font-extrabold tracking-[-.055em] text-[#172041]">Trois étapes pour prendre <span className="landing-gradient-text">confiance.</span></h2>
            <p className="mt-5 text-[16px] leading-7 text-[#727D98]">Pas de parcours compliqué. On part de votre objectif, on s’entraîne, et on avance ensemble.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {stages.map((stage)=> {
              const Icon=stage.icon;
              return <div key={stage.number} className={`landing-step-card landing-tone-${stage.tone} group relative overflow-hidden rounded-[28px] border border-[#E6E9F7] bg-white p-7 shadow-[0_13px_48px_rgba(70,75,150,.055)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_55px_rgba(92,72,185,.13)] sm:p-8`}>
                <div className="mb-12 flex items-center justify-between"><span className="landing-step-icon grid h-14 w-14 place-items-center rounded-[18px]"><Icon size={25} strokeWidth={1.9}/></span><span className="text-xs font-extrabold tracking-[.18em] text-[#B5BED5]">{stage.number}</span></div>
                <h3 className="text-xl font-extrabold tracking-[-.04em]">{stage.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#6B7793]">{stage.detail}</p>
              </div>;
            })}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#11183B] px-5 py-20 text-white sm:px-10 lg:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute -right-28 -top-40 h-[500px] w-[500px] rounded-full bg-[#8458F5]/25 blur-[100px]"/>
        <div className="relative mx-auto flex max-w-[1160px] flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="max-w-2xl"><span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.2em] text-[#BDA7FF]"><Sparkles size={16}/> Votre prochain pas</span><h2 className="mt-5 text-[clamp(2rem,4.2vw,3.5rem)] font-extrabold leading-tight tracking-[-.06em]">Votre meilleur entretien<br/>se prépare <span className="text-[#ECA0EF]">aujourd’hui.</span></h2><p className="mt-5 text-base leading-7 text-[#B5BFDF]">Un espace pour essayer, apprendre, recommencer. Sans pression.</p></div>
          <Link href="/login" className="landing-primary-btn inline-flex min-h-[58px] shrink-0 items-center gap-3 rounded-2xl px-7 text-sm font-bold text-white">C’est parti <MoveUpRight size={19}/></Link>
        </div>
      </section>
      <footer className="mx-auto flex max-w-[1240px] flex-col justify-between gap-3 px-5 py-9 text-xs text-[#7B85A0] sm:flex-row sm:px-10"><span>© {new Date().getFullYear()} InterviewLab · Votre coach d’entretien IA</span><span>Un outil d’entraînement, pas une décision de recrutement.</span></footer>
    </main>
  );
}
