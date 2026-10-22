import {
  canEngine, canEvaluate, roleFromVerifiedUser,
  validUuid, validCode, validLocale, safeQuestion, safeCandidateTurn,
} from "./policy.ts";

Deno.test("candidate cannot escalate role via user_metadata", () => {
  const user = {
    app_metadata: {ai_interview_role:"candidate"},
    user_metadata: {ai_interview_role:"admin"},
  };
  const role=roleFromVerifiedUser(user);
  if (canEngine(role) || canEvaluate(role)) throw Error("role escalation");
});

Deno.test("engine and evaluator permissions remain separated", () => {
  if (!canEngine("interview_engine") || canEvaluate("interview_engine")) throw Error("engine privilege");
  if (!canEvaluate("evaluator") || canEngine("evaluator")) throw Error("evaluator privilege");
  if (!canEngine("admin") || !canEvaluate("admin")) throw Error("admin privilege");
  if (canEngine("candidate") || canEvaluate("candidate")) throw Error("candidate privilege");
});

Deno.test("candidate projections never expose expected answers or private IDs", () => {
  const raw={code:"RH-001",version:1,family:"rh",category_code:"parcours",
    question_type:"introductory",difficulty:1,locale:"fr",prompt:"Bonjour",
    primary_competency:"communication",expected_elements:["secret"],
    red_flags:["secret"],rubric_version_id:"private-id",question_version_id:"private-id",
    answers:"private"};
  const safe=safeQuestion(raw);
  for(const field of ["expected_elements","red_flags","rubric_version_id","question_version_id","answers"]){
    if(Object.hasOwn(safe,field))throw Error("Unsafe field: "+field);
  }
  const turn=safeCandidateTurn({turn_index:1,question_code:"RH-001",locale:"fr",
      prompt_text:"Bonjour",rubric_version_id:"private",expected_elements:["secret"]});
  if(Object.keys(turn).sort().join(",")!=="locale,prompt_text,question_code,turn_index")
    throw Error("Candidate view contains private data");
});

Deno.test("reject non-canonical IDs and locales", () => {
  if (!validCode("RH-001") || validCode("RH-1") || validCode("../RH-001"))
    throw Error("Code validation");
  if (!validUuid("123e4567-e89b-42d3-a456-426614174000") ||
    validUuid("../../pg") || validUuid("none"))throw Error("UUID validation");
  if(!validLocale("fr") || !validLocale("en") || validLocale("de") || validLocale(null))
    throw Error("Locale validation");
});
