-- Disposable Postgres CI / rollback-safe Supabase test.
-- Exercises actual published-only selection and durable immutable snapshot design.
BEGIN;
DO $test$
DECLARE cat uuid; skill uuid; rub uuid; rv uuid; ques uuid;
        version1 uuid; version2 uuid; sess uuid; sess_en uuid; another_q uuid; another_v uuid;
        engine uuid := gen_random_uuid(); other_engine uuid := gen_random_uuid();
        candidate uuid := gen_random_uuid(); reviewer uuid := gen_random_uuid();
        s RECORD; blocked boolean;
BEGIN
 INSERT INTO question_bank.categories(code,family,label)
 VALUES('ci_interview_session','rh','CI interview') RETURNING id INTO cat;
 INSERT INTO question_bank.competencies(code,label)
 VALUES('ci_interview_skill','CI interview skill') RETURNING id INTO skill;
 INSERT INTO question_bank.rubrics(code,family)
 VALUES('CI_INTERVIEW_RUBRIC','rh') RETURNING id INTO rub;
 INSERT INTO question_bank.rubric_versions(rubric_id,version_no,weights,scale)
 VALUES(rub,1,'{"relevance": 100}'::jsonb,'{"1":"weak","5":"strong"}'::jsonb)
 RETURNING id INTO rv;
 PERFORM question_bank.publish_rubric(rv,reviewer);
 INSERT INTO question_bank.questions(code,category_id,origin)
 VALUES('RH-996',cat,'human') RETURNING id INTO ques;
 INSERT INTO question_bank.question_versions(
    question_id,version_no,status,question_type,difficulty,rubric_version_id,
    expected_elements,approved_for_publication,reviewed_by,reviewed_at)
 VALUES(ques,1,'draft','behavioral',1,rv,'["secret evaluation v1"]'::jsonb,
        true,reviewer,now()) RETURNING id INTO version1;
 INSERT INTO question_bank.localizations(question_version_id,locale,prompt)
 VALUES(version1,'fr','FR first immutable question'),
       (version1,'en','EN first immutable question');
 INSERT INTO question_bank.question_competencies(question_version_id,competency_id,is_primary)
 VALUES(version1,skill,true);

 -- A real interview session can be opened with a verified engine actor identity;
 -- no draft can be selected even by that engine.
 sess := question_bank.open_interview_session(candidate,engine,'fr');
 blocked:=false;
 BEGIN PERFORM question_bank.append_published_question(sess,'RH-996',engine);
 EXCEPTION WHEN OTHERS THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Draft was snapshotted'; END IF;
 blocked:=false;
 BEGIN PERFORM question_bank.append_published_question(sess,'RH-996',other_engine);
 EXCEPTION WHEN OTHERS THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Different engine actor selected a question'; END IF;

 PERFORM question_bank.publish_question(version1,reviewer);
 SELECT * INTO s FROM question_bank.append_published_question(sess,'RH-996',engine);
 IF s.turn_index<>1 OR s.question_version_id<>version1 OR s.rubric_version_id<>rv
    OR s.locale<>'fr' OR s.prompt_text<>'FR first immutable question' THEN
  RAISE EXCEPTION 'Incorrect versioned snapshot';
 END IF;
 IF (SELECT candidate_user_id FROM question_bank.interview_sessions WHERE id=sess) <> candidate
 THEN RAISE EXCEPTION 'Candidate identity was lost'; END IF;

 -- Published content can change via a NEW immutable version. Old snapshots
 -- must continue to reference the original question and rubric version/prompt.
 INSERT INTO question_bank.question_versions(
    question_id,version_no,status,question_type,difficulty,rubric_version_id,
    expected_elements,approved_for_publication,reviewed_by,reviewed_at)
 VALUES(ques,2,'draft','behavioral',1,rv,'["secret evaluation v2"]'::jsonb,
        true,reviewer,now()) RETURNING id INTO version2;
 INSERT INTO question_bank.localizations(question_version_id,locale,prompt)
 VALUES(version2,'fr','FR second immutable question'),
       (version2,'en','EN second immutable question');
 INSERT INTO question_bank.question_competencies(question_version_id,competency_id,is_primary)
 VALUES(version2,skill,true);
 PERFORM question_bank.publish_question(version2,reviewer);
 IF (SELECT question_version_id FROM question_bank.interview_question_snapshots
     WHERE session_id=sess AND turn_index=1)<>version1 OR
    (SELECT prompt_text FROM question_bank.interview_question_snapshots
     WHERE session_id=sess AND turn_index=1)<>'FR first immutable question' THEN
   RAISE EXCEPTION 'Previous session snapshot was overwritten by new revision';
 END IF;

 blocked:=false;
 BEGIN UPDATE question_bank.interview_question_snapshots
 SET prompt_text='changed' WHERE session_id=sess;
 EXCEPTION WHEN OTHERS THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Immutable snapshot accepted UPDATE'; END IF;
 blocked:=false;
 BEGIN DELETE FROM question_bank.interview_question_snapshots WHERE session_id=sess;
 EXCEPTION WHEN OTHERS THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Immutable snapshot accepted DELETE'; END IF;
 blocked:=false;
 BEGIN PERFORM question_bank.append_published_question(sess,'RH-996',other_engine);
 EXCEPTION WHEN OTHERS THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Unowned engine could append'; END IF;
 blocked:=false;
 BEGIN PERFORM question_bank.append_published_question(sess,'RH-996',engine);
 EXCEPTION WHEN unique_violation THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Duplicate question in same session permitted'; END IF;
 IF (SELECT count(*) FROM question_bank.interview_question_snapshots WHERE session_id=sess)<>1
 THEN RAISE EXCEPTION 'Rejected writes changed session'; END IF;


 -- Publish a second approved question and test dynamic non-repeating selection.
 INSERT INTO question_bank.questions(code,category_id,origin)
 VALUES('RH-995',cat,'human') RETURNING id INTO another_q;
 INSERT INTO question_bank.question_versions(
  question_id,version_no,status,question_type,difficulty,rubric_version_id,
  expected_elements,approved_for_publication,reviewed_by,reviewed_at)
 VALUES(another_q,1,'draft','behavioral',1,rv,'["internal response"]'::jsonb,
        true,reviewer,now()) RETURNING id INTO another_v;
 INSERT INTO question_bank.localizations(question_version_id,locale,prompt)
 VALUES(another_v,'fr','Autre question publiée'),
       (another_v,'en','Another published question');
 INSERT INTO question_bank.question_competencies(question_version_id,competency_id,is_primary)
 VALUES(another_v,skill,true);
 PERFORM question_bank.publish_question(another_v,reviewer);
 SELECT * INTO s FROM question_bank.next_interview_question(sess,engine,'rh',NULL,1::smallint);
 IF s.question_code<>'RH-995' OR s.turn_index<>2 OR s.prompt_text<>'Autre question publiée'
 THEN RAISE EXCEPTION 'Automatic selection ignored filters or asked previous code'; END IF;
 blocked:=false;
 BEGIN PERFORM question_bank.next_interview_question(sess,engine,'rh',NULL,1::smallint);
 EXCEPTION WHEN OTHERS THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Re-asked exhausted questions'; END IF;
 sess_en := question_bank.open_interview_session(candidate,engine,'en');
 SELECT * INTO s FROM question_bank.next_interview_question(sess_en,engine,'rh',NULL,1::smallint);
 IF s.turn_index<>1 OR s.locale<>'en' OR s.prompt_text<>'Another published question'
 THEN RAISE EXCEPTION 'Selection did not honor English session locale'; END IF;
 blocked:=false;
 BEGIN PERFORM question_bank.next_interview_question(sess_en,other_engine,'rh',NULL,1::smallint);
 EXCEPTION WHEN OTHERS THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Unowned engine invoked dynamic selection'; END IF;


 -- A session may only be completed by its owning engine.
 blocked:=false;
 BEGIN PERFORM question_bank.complete_interview_session(sess,other_engine);
 EXCEPTION WHEN OTHERS THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Unowned engine completed interview'; END IF;
 PERFORM question_bank.complete_interview_session(sess,engine);
 IF NOT EXISTS (SELECT 1 FROM question_bank.interview_sessions
                WHERE id=sess AND status='completed' AND completed_at IS NOT NULL) THEN
   RAISE EXCEPTION 'Interview session completion was not persisted';
 END IF;
 blocked:=false;
 BEGIN PERFORM question_bank.next_interview_question(sess,engine,'rh',NULL,1::smallint);
 EXCEPTION WHEN OTHERS THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Completed session accepted another question'; END IF;
 IF (SELECT count(*) FROM question_bank.interview_question_snapshots WHERE session_id=sess)<>2 THEN
   RAISE EXCEPTION 'Session completion changed immutable snapshots';
 END IF;

 IF has_table_privilege('anon','question_bank.interview_sessions','SELECT')
    OR has_table_privilege('authenticated','question_bank.interview_question_snapshots','SELECT')
    OR has_function_privilege('authenticated',
      'question_bank.append_published_question(uuid,text,uuid)','EXECUTE') THEN
   RAISE EXCEPTION 'Client acquired private interview privileges';
 END IF;
END $test$;
ROLLBACK;
