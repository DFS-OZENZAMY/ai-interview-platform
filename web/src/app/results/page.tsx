"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  CheckCircle2,
  LayoutDashboard,
  MessageSquareQuote,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { readLastInterviewReport, type LastInterviewReport } from "@/lib/last-interview-report";

export default function ResultsPage() {
  const [report, setReport] = useState<LastInterviewReport | null | undefined>(undefined);

  useEffect(() => {
    const saved = readLastInterviewReport();
    queueMicrotask(() => setReport(saved));
  }, []);

  if (report === undefined) {
    return (
      <main role="status" className="flex min-h-dvh items-center justify-center bg-[#F8F9FF] text-sm font-semibold text-[#65718E]">
        Chargement du bilan de Lina…
      </main>
    );
  }

  if (!report) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-[#F8F9FF] px-5 text-center text-[#202744]">
        <p className="text-lg font-bold">Aucun bilan disponible dans cet onglet.</p>
        <p className="mt-3 max-w-md text-sm leading-7 text-[#65718E]">
          Terminez une simulation pour recevoir le regard de Lina. Le bilan reste local à votre navigateur tant que la persistance Supabase n’est pas activée.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/preparation" className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-[#5365FF] via-[#8755F4] to-[#DF4DC5] px-6 text-sm font-bold text-white">
            Lancer une simulation <ArrowRight size={17} />
          </Link>
          <Link href="/dashboard" className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-[#DDD8EF] bg-white px-6 text-sm font-semibold text-[#566184]">
            Retour au dashboard
          </Link>
        </div>
      </main>
    );
  }

  const kindLabel = report.interview_kind === "rh" ? "Entretien RH" : "Entretien technique";
  const turns = report.transcript.slice(-6);
  const isPartial = report.status === "partial";

  return (
    <main className="min-h-dvh bg-[#F8F9FF] pb-20 text-[#202744]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_at_70%_0%,#F5D9F4_0%,#E7E8FF_45%,transparent_82%)]" aria-hidden />
      <div className="relative mx-auto max-w-[1150px] px-5 pt-8 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[#DDD8EF] bg-white/80 px-4 text-sm font-semibold text-[#566184]"
          >
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <span
            className={`rounded-full border px-4 py-2 text-xs font-extrabold tracking-wide ${
              isPartial
                ? "border-[#EFCCCD] bg-[#FFF0EF] text-[#B54E65]"
                : "border-[#BFE3D5] bg-[#EAF9F4] text-[#16836A]"
            }`}
          >
            {isPartial ? "BILAN PARTIEL · LINA" : "BILAN LINA · NON NOTÉ"}
          </span>
        </header>

        <div className="mt-11">
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#8357D9]">Votre bilan d’entretien</p>
          <h1 className="mt-3 text-[clamp(2.2rem,5vw,3.8rem)] font-extrabold leading-[1.08] tracking-[-.055em]">
            Le regard de Lina
            <br />
            <span className="bg-gradient-to-r from-[#5365FF] via-[#9156EF] to-[#DD4FC0] bg-clip-text text-transparent">
              sur cette séance.
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#65718E]">
            Feedback pédagogique généré par Lina à partir de vos réponses. Aucune note chiffrée, aucun verdict de recrutement — uniquement des pistes pour progresser.
          </p>
        </div>

        <div className="mt-9 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <section className="rounded-[30px] border border-white bg-white/85 p-7 shadow-[0_20px_65px_rgba(93,80,161,.10)] backdrop-blur-lg sm:p-9">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-[#EAF9F4] px-3 py-1.5 text-xs font-bold text-[#16836A]">
                <CheckCircle2 className="mr-1 inline" size={15} /> {isPartial ? "Séance interrompue" : "Entretien terminé"}
              </span>
              <span className="text-xs text-[#8490A7]">
                {kindLabel}
                {report.job_title ? ` · ${report.job_title}` : ""} · {report.locale === "en" ? "English" : "Français"}
              </span>
            </div>
            <div className="mt-7">
              <span className="text-xs font-bold uppercase tracking-[.13em] text-[#8260CE]">Bilan pédagogique</span>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#4A556F]">{report.feedback}</p>
            </div>
            <div className="mt-7 grid gap-3 border-t border-[#EBEAF5] pt-6 sm:grid-cols-3">
              <div>
                <p className="text-xs text-[#8290A5]">Type</p>
                <p className="mt-1 text-sm font-bold">{kindLabel}</p>
              </div>
              <div>
                <p className="text-xs text-[#8290A5]">Échanges</p>
                <p className="mt-1 text-sm font-bold">{report.transcript.length || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-[#8290A5]">Date</p>
                <p className="mt-1 text-sm font-bold">
                  {new Date(report.completed_at).toLocaleDateString(report.locale === "en" ? "en-GB" : "fr-FR")}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-[#E1D7FB] bg-gradient-to-br from-[#F3EDFF] via-[#F6EEFF] to-[#FCEAF7] p-7 sm:p-9">
            <div className="flex items-center gap-2 text-sm font-extrabold text-[#7451CE]">
              <BrainCircuit size={21} /> Le regard de Lina
            </div>
            <h2 className="mt-7 text-2xl font-extrabold leading-tight">
              {report.coach_priority || "Continuez à vous entraîner avec des exemples concrets."}
            </h2>
            <p className="mt-5 text-sm leading-7 text-[#625E86]">
              {report.coach_recommendation || report.feedback.slice(0, 220)}
            </p>
            <div className="mt-7 rounded-2xl border border-white/80 bg-white/70 p-4 text-sm leading-6 text-[#614F93]">
              <Sparkles size={17} className="mr-2 inline" />
              Conseil : refaites une simulation en ciblant un seul axe d’amélioration.
            </div>
          </section>
        </div>

        {turns.length > 0 && (
          <section className="mt-6 rounded-[30px] border border-white bg-white/85 p-7 shadow-[0_15px_48px_rgba(93,80,161,.07)] sm:p-9">
            <h2 className="flex items-center gap-2 text-xl font-extrabold">
              <MessageSquareQuote size={22} className="text-[#865CE0]" /> Extraits de la séance
            </h2>
            <p className="mt-2 text-xs text-[#74819C]">Derniers échanges conservés pour cette session (localement dans l’onglet).</p>
            <div className="mt-6 space-y-4">
              {turns.map((turn, i) => (
                <div key={i} className="grid gap-3 rounded-2xl border border-[#EBEAF5] bg-[#F8F9FF]/80 p-5 lg:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold text-[#8050D9]">Question</p>
                    <p className="mt-2 text-sm leading-6 text-[#586681]">{turn.question}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#75819E]">Votre réponse</p>
                    <p className="mt-2 text-sm leading-6 text-[#586681]">{turn.answer || "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <section className="rounded-[28px] border border-[#D5EDE5] bg-[#F1FCF7] p-7">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#167C69]">
              <BadgeCheck size={21} /> Points d’appui
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#3D655D]">
              Lina a formulé un point fort dans le bilan ci-dessus. Reprenez-le avant votre prochaine simulation pour consolider ce qui fonctionne déjà.
            </p>
          </section>
          <section className="rounded-[28px] border border-[#F5D6E8] bg-[#FFF3F9] p-7">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#B84B8D]">
              <TriangleAlert size={21} /> Axes de travail
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#825E74]">
              Le point d’amélioration et l’exercice proposé par Lina sont dans le texte du bilan. Ciblez-en un seul lors de la prochaine séance.
            </p>
          </section>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-xl text-xs leading-6 text-[#9B6C84]">
            Ce bilan provient du moteur Lina (feedback textuel, non noté). Il est stocké dans cet onglet uniquement ; l’enregistrement durable dans Supabase reste une étape ultérieure (clé service côté serveur).
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-[#DDD8EF] bg-white px-5 text-sm font-semibold text-[#566184]"
            >
              <LayoutDashboard size={17} /> Dashboard
            </Link>
            <Link
              href="/preparation"
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-[#5365FF] via-[#8755F4] to-[#DF4DC5] px-6 text-sm font-bold text-white shadow-[0_12px_26px_rgba(113,89,233,.24)]"
            >
              Nouvelle simulation <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
