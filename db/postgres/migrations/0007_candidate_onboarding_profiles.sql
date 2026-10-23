-- S2-01: user-owned onboarding preferences with Supabase Auth.
BEGIN;
CREATE TABLE public.candidate_profiles (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 professional_goal text NOT NULL CHECK(professional_goal IN ('first_job','job_change','career_growth')),
 preparation_goals text[] NOT NULL DEFAULT '{}'::text[]
 CHECK (
 cardinality(preparation_goals) BETWEEN 1 AND 5
 AND array_position(preparation_goals,NULL) IS NULL
 AND preparation_goals <@ ARRAY[
 'confidence','answer_structure','communication','domain_knowledge','stress_management'
 ]::text[]),
 target_role text CHECK(target_role IS NULL OR length(btrim(target_role)) BETWEEN 1 AND 120),
 preferred_locale text NOT NULL DEFAULT 'fr' CHECK(preferred_locale IN ('fr','en')),
 onboarding_completed_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.candidate_profiles FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.candidate_profiles TO authenticated;
CREATE POLICY candidate_profile_select_own ON public.candidate_profiles
 FOR SELECT TO authenticated USING ((SELECT auth.uid())=user_id);
CREATE POLICY candidate_profile_insert_own ON public.candidate_profiles
 FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid())=user_id);
CREATE POLICY candidate_profile_update_own ON public.candidate_profiles
 FOR UPDATE TO authenticated USING ((SELECT auth.uid())=user_id)
 WITH CHECK ((SELECT auth.uid())=user_id);
COMMENT ON TABLE public.candidate_profiles IS 'S2-01 self-owned preferences. Per-simulation overrides never update this profile unless user explicitly saves.';
COMMIT;
