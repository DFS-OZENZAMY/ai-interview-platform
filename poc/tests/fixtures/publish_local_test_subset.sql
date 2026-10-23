-- ⚠️  BASE LOCALE DE TEST UNIQUEMENT. Ne JAMAIS exécuter sur Supabase ni sur une base partagée.
-- Publie un sous-ensemble (2 questions par catégorie) avec un relecteur SYNTHÉTIQUE, via les fonctions
-- officielles question_bank.publish_rubric / publish_question (aucun contournement des contrôles).
-- Sert uniquement à tester le branchement « source de questions » de bout en bout, car les 120 questions
-- réelles sont en brouillon tant que la revue humaine n'est pas faite.
-- Usage : psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SET repetition.local_test_fixture = 'on'" -f publish_local_test_subset.sql
--         (ou PGOPTIONS='-c repetition.local_test_fixture=on')
BEGIN;
DO $guard$
BEGIN
  IF coalesce(current_setting('repetition.local_test_fixture', true), '') <> 'on' THEN
    RAISE EXCEPTION 'Refus : définir repetition.local_test_fixture=on (base locale de test uniquement)';
  END IF;
  IF current_database() = 'postgres' OR EXISTS (SELECT 1 FROM pg_namespace WHERE nspname IN ('auth','storage','supabase_functions')) THEN
    RAISE EXCEPTION 'Refus : cette base ressemble à Supabase ou à une base partagée';
  END IF;
END $guard$;

DO $pub$
DECLARE reviewer uuid := '00000000-0000-4000-8000-0000000000aa';  -- relecteur synthétique de test
DECLARE rv record; v record; n int := 0;
BEGIN
  FOR rv IN SELECT id FROM question_bank.rubric_versions WHERE status <> 'published' LOOP
    PERFORM question_bank.publish_rubric(rv.id, reviewer);
  END LOOP;
  FOR v IN
    SELECT id FROM (
      SELECT qv.id, row_number() OVER (PARTITION BY q.category_id ORDER BY qv.difficulty, q.code) AS rn
      FROM question_bank.question_versions qv JOIN question_bank.questions q ON q.id = qv.question_id
      WHERE qv.status = 'draft'
    ) x WHERE rn <= 2
  LOOP
    UPDATE question_bank.question_versions SET approved_for_publication = true, reviewed_by = reviewer, reviewed_at = now() WHERE id = v.id;
    PERFORM question_bank.publish_question(v.id, reviewer);
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'Publication de test locale : % questions', n;
END $pub$;
COMMIT;
