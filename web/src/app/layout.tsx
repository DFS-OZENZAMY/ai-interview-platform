import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Interview Platform — Préparez votre prochain entretien",
  description: "Un accompagnement personnalisé pour préparer vos entretiens RH et techniques.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body className="antialiased">{children}</body></html>;
}
