-- Reference migration applied to Supabase project aqybktqgoartjiqoqcfg
-- via MCP migration candidate_profile_context_and_app_roles on 2026-10-23.
alter table public.candidate_profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists employment_status text,
  add column if not exists experience_level text;
alter table public.candidate_profiles drop constraint if exists candidate_profiles_professional_goal_check;
alter table public.candidate_profiles add constraint candidate_profiles_professional_goal_check
  check (professional_goal in ('first_job','internship','job_change','career_growth','return_to_work','employment_transition','client_pitches'));
alter table public.candidate_profiles add constraint candidate_profiles_employment_status_check
  check (employment_status is null or employment_status in ('student','employed','looking','independent'));
alter table public.candidate_profiles add constraint candidate_profiles_experience_level_check
  check (experience_level is null or experience_level in ('starting','junior','experienced','senior'));
alter table public.candidate_profiles add constraint candidate_profiles_first_name_check
  check (first_name is null or (char_length(btrim(first_name)) between 1 and 80));
alter table public.candidate_profiles add constraint candidate_profiles_last_name_check
  check (last_name is null or (char_length(btrim(last_name)) between 1 and 80));
create table if not exists public.app_user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user','admin','coach')),
  created_at timestamptz not null default now()
);
alter table public.app_user_roles enable row level security;
revoke all on public.app_user_roles from anon;
grant select on public.app_user_roles to authenticated;
create policy app_user_roles_select_own on public.app_user_roles for select to authenticated
using ((select auth.uid())=user_id);
revoke insert, update, delete on public.app_user_roles from authenticated, anon;
