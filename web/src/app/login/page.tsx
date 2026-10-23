import type { Metadata } from "next";
import { LoginForm } from "@/components/ui/login-form";

export const metadata: Metadata = {
  title: "Connexion | Interview Platform",
  description: "Créez votre espace ou connectez-vous pour préparer vos entretiens.",
};

export default function LoginPage() {
  return <LoginForm />;
}
