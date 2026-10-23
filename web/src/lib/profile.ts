import type { SupabaseClient } from "@supabase/supabase-js";
import type { OnboardingProfile } from "@/components/ui/onboarding-stages";
import { goalsForContext, professionalOptions, employmentOptions, experienceOptions } from "@/components/ui/onboarding-stages";

export type AppRole = "user" | "admin" | "coach";
export type SavedProfile = { profile: OnboardingProfile; completed: boolean };

export async function getAppRole(client: SupabaseClient, id: string): Promise<AppRole> {
  const { data, error } = await client.from("app_user_roles").select("role").eq("user_id", id).maybeSingle();
  if (error) throw error;
  return data?.role === "admin" || data?.role === "coach" ? data.role : "user";
}

export async function readProfile(client: SupabaseClient, userId: string): Promise<SavedProfile | null> {
  const { data, error } = await client.from("candidate_profiles").select("first_name,last_name,employment_status,experience_level,professional_goal,preparation_goals,preferred_locale,onboarding_completed_at").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const status = employmentOptions.find(x=>x.value === data.employment_status)?.value;
  const exp = experienceOptions.find(x=>x.value === data.experience_level)?.value;
  const legalGoal = professionalOptions.find(x=>x.value === data.professional_goal)?.value;
  if (!status || !legalGoal || !goalsForContext(status,exp).includes(legalGoal)) return null;
  const preparationGoals = (Array.isArray(data.preparation_goals) ? data.preparation_goals : []).filter(
    (v: string) => ["confidence","answer_structure","communication","domain_knowledge","stress_management"].includes(v)
  ) as OnboardingProfile["preparationGoals"];
  if (!preparationGoals.length) return null;
  return {
    profile: {
      firstName: data.first_name ?? "",
      lastName: data.last_name ?? "",
      employmentStatus: status,
      experienceLevel: exp,
      professionalGoal: legalGoal,
      preparationGoals,
      preferredLocale: data.preferred_locale === "en" ? "en" : "fr",
    },
    completed: Boolean(data.onboarding_completed_at),
  };
}

export async function writeProfile(client: SupabaseClient, userId: string, p: OnboardingProfile) {
  if (!p.firstName.trim() || !p.lastName.trim() || !p.employmentStatus ||
      !goalsForContext(p.employmentStatus, p.experienceLevel).includes(p.professionalGoal) ||
      !p.preparationGoals.length || p.preparationGoals.length > 3) {
    throw new Error("Profil invalide");
  }
  const { error } = await client.from("candidate_profiles").upsert({
    user_id: userId, first_name: p.firstName.trim(), last_name: p.lastName.trim(),
    employment_status: p.employmentStatus, experience_level: p.experienceLevel ?? null,
    professional_goal: p.professionalGoal, preparation_goals: p.preparationGoals,
    preferred_locale: p.preferredLocale, onboarding_completed_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw error;
}
