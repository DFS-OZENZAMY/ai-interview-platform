-- S2-04 interview session lifecycle: explicit owner-only completion.
-- No direct client privileges. This never changes historical snapshots.
BEGIN;
CREATE FUNCTION question_bank.complete_interview_session(
  p_session uuid, p_engine_actor uuid
) RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
DECLARE sr question_bank.interview_sessions%ROWTYPE;
BEGIN
 IF p_session IS NULL OR p_engine_actor IS NULL THEN
   RAISE EXCEPTION 'Session and engine actor required';
 END IF;
 SELECT * INTO sr FROM question_bank.interview_sessions s
 WHERE s.id=p_session FOR UPDATE;
 IF NOT FOUND OR sr.engine_actor_id<>p_engine_actor OR sr.status<>'active' THEN
   RAISE EXCEPTION 'Only the owning engine can complete an active interview session';
 END IF;
 UPDATE question_bank.interview_sessions
 SET status='completed',completed_at=now() WHERE id=p_session;
END $fn$;
REVOKE ALL ON FUNCTION question_bank.complete_interview_session(uuid,uuid)
FROM PUBLIC,anon,authenticated;
COMMIT;
