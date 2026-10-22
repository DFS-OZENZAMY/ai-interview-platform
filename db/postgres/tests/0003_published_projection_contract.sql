-- Integration test: owner-visible safe projection includes ONLY published rows and no private fields.
-- Run in disposable PostgreSQL AFTER migrations 0001-0004; rolls back fixtures.
BEGIN;
DO $case$
DECLARE c uuid; k uuid; r uuid; rv uuid; qpub uuid; qdraft uuid; vp uuid; vd uuid;
        human uuid := gen_random_uuid();
BEGIN
  INSERT INTO question_bank.categories(code,family,label)
  VALUES ('ci_safe_projection','rh','CI safe projection') RETURNING id INTO c;
  INSERT INTO question_bank.competencies(code,label)
  VALUES ('ci_skill','CI skill') RETURNING id INTO k;
  INSERT INTO question_bank.rubrics(code,family)
  VALUES ('CI_SAFE_RUBRIC','rh') RETURNING id INTO r;
  INSERT INTO question_bank.rubric_versions(rubric_id,version_no,weights,scale)
  VALUES (r,1,'{"clarity":100}'::jsonb,'{"1":"weak","5":"strong"}'::jsonb)
  RETURNING id INTO rv;
  PERFORM question_bank.publish_rubric(rv,human);
  INSERT INTO question_bank.questions(code,category_id,origin)
  VALUES ('RH-998',c,'human') RETURNING id INTO qpub;
  INSERT INTO question_bank.question_versions
     (question_id,version_no,status,question_type,difficulty,rubric_version_id,
      expected_elements,approved_for_publication,reviewed_by,reviewed_at)
  VALUES (qpub,1,'draft','behavioral',1,rv,'["PRIVATE EXPECTED ANSWER"]'::jsonb,
          true,human,now()) RETURNING id INTO vp;
  INSERT INTO question_bank.questions(code,category_id,origin)
  VALUES ('RH-999',c,'human') RETURNING id INTO qdraft;
  INSERT INTO question_bank.question_versions
     (question_id,version_no,status,question_type,difficulty,rubric_version_id,
      expected_elements)
  VALUES (qdraft,1,'draft','behavioral',1,rv,'["PRIVATE DRAFT"]'::jsonb)
  RETURNING id INTO vd;
  INSERT INTO question_bank.localizations(question_version_id,locale,prompt)
  VALUES (vp,'fr','Question publiée fictive'),
         (vp,'en','Synthetic published question'),
         (vd,'fr','Question non publiée'),
         (vd,'en','Unpublished draft');
  INSERT INTO question_bank.question_competencies(question_version_id,competency_id,is_primary)
  VALUES (vp,k,true),(vd,k,true);
  PERFORM question_bank.publish_question(vp,human);

  IF (SELECT count(*) FROM question_bank.published_questions_safe
      WHERE code='RH-998') <> 2 THEN
      RAISE EXCEPTION 'Published FR/EN projection missing';
  END IF;
  IF EXISTS(SELECT 1 FROM question_bank.published_questions_safe WHERE code='RH-999') THEN
      RAISE EXCEPTION 'Draft question was exposed';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='question_bank' AND table_name='published_questions_safe'
      AND column_name IN ('expected_elements','red_flags','evaluation_notes',
        'acceptable_variations','weights','scale')
  ) THEN
    RAISE EXCEPTION 'Candidate-safe projection includes private fields';
  END IF;
  IF has_table_privilege('authenticated','question_bank.published_questions_safe','SELECT')
     OR has_table_privilege('anon','question_bank.published_questions_safe','SELECT') THEN
     RAISE EXCEPTION 'Client role can read private projection';
  END IF;
END $case$;
ROLLBACK;
