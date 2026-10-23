"""Static checks for Supabase candidate onboarding profile access boundary."""
from pathlib import Path
import unittest

SQL = (Path(__file__).resolve().parents[1] / "db/postgres/migrations" /
       "0007_candidate_onboarding_profiles.sql").read_text(encoding="utf-8").lower()

class OnboardingProfileSecurityTests(unittest.TestCase):
    def test_rls_and_owner_bound_policies(self):
        self.assertIn("enable row level security", SQL)
        self.assertIn("revoke all on public.candidate_profiles from public,anon,authenticated", SQL)
        self.assertIn("grant select,insert,update on public.candidate_profiles to authenticated", SQL)
        self.assertIn("candidate_profile_select_own", SQL)
        self.assertIn("candidate_profile_insert_own", SQL)
        self.assertIn("candidate_profile_update_own", SQL)
        self.assertGreaterEqual(SQL.count("(select auth.uid())=user_id"), 4)
        self.assertNotIn("grant delete", SQL)
        self.assertNotIn("security definer", SQL)

    def test_no_cv_storage_and_goals_are_distinct(self):
        for code in ("first_job","job_change","career_growth",
                     "confidence","answer_structure","communication",
                     "domain_knowledge","stress_management"):
            self.assertIn(code, SQL)
        self.assertIn("professional_goal", SQL)
        self.assertIn("preparation_goals", SQL)
        self.assertNotIn("resume_upload", SQL)
        self.assertNotIn("job_description text", SQL)
        self.assertNotIn("cv_data", SQL)

if __name__ == "__main__":
    unittest.main()
