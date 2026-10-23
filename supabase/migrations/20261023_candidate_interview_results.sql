-- Candidate interview result summaries for adaptive dashboard.
-- No fabricated scores; rows are written only by trusted simulation processing.
create table if not exists public.candidate_interview_results (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 interview_kind text not null check (interview_kind in ('rh','technical')),
 job_title text,
 duration_minutes integer check (duration_minutes in (10,20,35)),
 status text not null check (status in ('completed','partial')),
 completed_at timestamptz not null default now(),
 score numeric(5,2) check (score is null or (score >= 0 and score <= 100)),
 score_eligible boolean not null default false,
 coach_priority text,
 coach_recommendation text,
 report_path text,
 constraint score_requires_eligibility check (score is null or score_eligible)
);
create index if not exists candidate_interview_results_user_recent
 on public.candidate_interview_results(user_id, completed_at desc);
alter table public.candidate_interview_results enable row level security;
create policy "candidates_read_own_interview_results"
 on public.candidate_interview_results for select to authenticated
 using (auth.uid()=user_id);
-- No client-side insert/update/delete policy: results must be created by
-- a trusted evaluator through a server-side privileged process.
