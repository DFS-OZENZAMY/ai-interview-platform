-- S2-03 ↔ S2-04 minimal durable handoff: immutable question snapshots.
-- PostgreSQL and Supabase. Keep private; no direct browser grants.
BEGIN;
CREATE TABLE question_bank.interview_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 candidate_user_id uuid NOT NULL,
 engine_actor_id uuid NOT NULL,
 locale text NOT NULL CHECK (locale IN ('fr','en')),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed','cancelled')),
 started_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 CHECK ((status='active' AND completed_at IS NULL) OR status<>'active')
);
CREATE INDEX idx_qb_sessions_candidate ON question_bank.interview_sessions(candidate_user_id,started_at DESC);
CREATE INDEX idx_qb_sessions_engine ON question_bank.interview_sessions(engine_actor_id,started_at DESC);

CREATE TABLE question_bank.interview_question_snapshots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 session_id uuid NOT NULL REFERENCES question_bank.interview_sessions(id) ON DELETE RESTRICT,
 turn_index integer NOT NULL CHECK (turn_index>=1),
 question_version_id uuid NOT NULL REFERENCES question_bank.question_versions(id) ON DELETE RESTRICT,
 rubric_version_id uuid NOT NULL REFERENCES question_bank.rubric_versions(id) ON DELETE RESTRICT,
 question_code text NOT NULL,
 locale text NOT NULL CHECK (locale IN ('fr','en')),
 prompt_text text NOT NULL CHECK (length(btrim(prompt_text))>0),
 selected_by uuid NOT NULL,
 selected_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(session_id,turn_index),
 UNIQUE(session_id,question_version_id),
 UNIQUE(session_id,question_code)
);
CREATE INDEX idx_qb_snapshots_question_version ON question_bank.interview_question_snapshots(question_version_id);
CREATE INDEX idx_qb_snapshots_rubric_version ON question_bank.interview_question_snapshots(rubric_version_id);

CREATE FUNCTION question_bank.immutable_interview_snapshot()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
BEGIN
 RAISE EXCEPTION 'Interview question snapshots are immutable; create a new session';
END $fn$;
CREATE TRIGGER trg_immutable_interview_snapshot
BEFORE UPDATE OR DELETE ON question_bank.interview_question_snapshots
FOR EACH ROW EXECUTE FUNCTION question_bank.immutable_interview_snapshot();

-- Caller identity is verified by the Edge Function using Supabase Auth getUser,
-- NOT taken from mutable user_metadata. Caller MUST have app_metadata engine role.
CREATE FUNCTION question_bank.open_interview_session(
 p_candidate uuid, p_engine_actor uuid, p_locale text
) RETURNS uuid LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
DECLARE v_id uuid;
BEGIN
 IF p_candidate IS NULL OR p_engine_actor IS NULL OR p_locale NOT IN ('fr','en')
 THEN RAISE EXCEPTION 'Valid candidate, engine actor and locale required'; END IF;
 INSERT INTO question_bank.interview_sessions(candidate_user_id,engine_actor_id,locale)
 VALUES(p_candidate,p_engine_actor,p_locale) RETURNING id INTO v_id;
 RETURN v_id;
END $fn$;

CREATE FUNCTION question_bank.append_published_question(
 p_session uuid, p_code text, p_engine_actor uuid
) RETURNS TABLE(
 snapshot_id uuid, turn_index integer, question_code text,
 question_version_id uuid, rubric_version_id uuid,
 locale text, prompt_text text
) LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
DECLARE session_record question_bank.interview_sessions%ROWTYPE;
DECLARE source_record RECORD;
DECLARE next_turn integer;
DECLARE new_snapshot uuid;
BEGIN
 IF p_session IS NULL OR p_code IS NULL OR p_engine_actor IS NULL
 THEN RAISE EXCEPTION 'Session, question code and engine required'; END IF;
 SELECT * INTO session_record FROM question_bank.interview_sessions s
 WHERE s.id = p_session FOR UPDATE;
 IF NOT FOUND OR session_record.status <> 'active'
 THEN RAISE EXCEPTION 'Active interview session not found'; END IF;
 IF session_record.engine_actor_id <> p_engine_actor
 THEN RAISE EXCEPTION 'Engine actor does not own interview session'; END IF;
 SELECT s.question_version_id, s.rubric_version_id, s.code,
        s.locale, s.prompt INTO source_record
 FROM question_bank.published_questions_safe s
 WHERE s.code=p_code AND s.locale=session_record.locale;
 IF NOT FOUND THEN RAISE EXCEPTION 'Question is not approved and published'; END IF;
 SELECT coalesce(max(qs.turn_index),0)+1 INTO next_turn
 FROM question_bank.interview_question_snapshots qs WHERE qs.session_id=p_session;
 INSERT INTO question_bank.interview_question_snapshots
 (session_id,turn_index,question_version_id,rubric_version_id,
  question_code,locale,prompt_text,selected_by)
 VALUES(p_session,next_turn,source_record.question_version_id,
        source_record.rubric_version_id,source_record.code,
        source_record.locale,source_record.prompt,p_engine_actor)
 RETURNING id INTO new_snapshot;
 RETURN QUERY SELECT new_snapshot,next_turn,source_record.code::text,
        source_record.question_version_id,source_record.rubric_version_id,
        source_record.locale::text,source_record.prompt::text;
END $fn$;

-- Deterministic S2-04 selection: choose one not-yet-asked published question.
-- Lock session to serialize concurrent next-question requests.
CREATE FUNCTION question_bank.next_interview_question(
 p_session uuid, p_engine_actor uuid,
 p_family text DEFAULT NULL, p_category text DEFAULT NULL,
 p_difficulty smallint DEFAULT NULL
) RETURNS TABLE(
 snapshot_id uuid, turn_index integer, question_code text,
 question_version_id uuid, rubric_version_id uuid,
 locale text, prompt_text text
) LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
DECLARE sr question_bank.interview_sessions%ROWTYPE;
DECLARE selected_code text;
BEGIN
 SELECT * INTO sr FROM question_bank.interview_sessions i
 WHERE i.id=p_session FOR UPDATE;
 IF NOT FOUND OR sr.status<>'active' OR sr.engine_actor_id<>p_engine_actor
 THEN RAISE EXCEPTION 'Active interview session not owned by engine'; END IF;
 IF p_family IS NOT NULL AND p_family NOT IN ('rh','transversal','technical')
 THEN RAISE EXCEPTION 'Invalid family filter'; END IF;
 IF p_difficulty IS NOT NULL AND p_difficulty NOT BETWEEN 1 AND 4
 THEN RAISE EXCEPTION 'Invalid difficulty filter'; END IF;
 SELECT s.code INTO selected_code
 FROM question_bank.published_questions_safe s
 WHERE s.locale=sr.locale
   AND (p_family IS NULL OR s.family=p_family)
   AND (p_category IS NULL OR s.category_code=p_category)
   AND (p_difficulty IS NULL OR s.difficulty=p_difficulty)
   AND NOT EXISTS (
     SELECT 1 FROM question_bank.interview_question_snapshots prior
     WHERE prior.session_id=p_session AND prior.question_code=s.code
   )
 ORDER BY s.difficulty, s.code LIMIT 1;
 IF NOT FOUND THEN RAISE EXCEPTION 'No eligible published question'; END IF;
 RETURN QUERY SELECT * FROM question_bank.append_published_question(
   p_session,selected_code,p_engine_actor
 );
END $fn$;

-- All session/snapshot content is private; no browser access or PUBLIC EXECUTE.
ALTER TABLE question_bank.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_bank.interview_question_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON question_bank.interview_sessions FROM PUBLIC,anon,authenticated;
REVOKE ALL ON question_bank.interview_question_snapshots FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION question_bank.open_interview_session(uuid,uuid,text)
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION question_bank.append_published_question(uuid,text,uuid)
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION question_bank.next_interview_question(uuid,uuid,text,text,smallint)
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION question_bank.immutable_interview_snapshot()
  FROM PUBLIC,anon,authenticated;
COMMIT;
