#!/usr/bin/env node
/**
 * Real HTTP/Auth smoke test for the deployed Supabase S2-03/S2-04 bridge.
 *
 * Requires throwaway Supabase Auth accounts provisioned by the project admin.
 * Do NOT commit credentials; use local secure environment variables.
 * Does not publish questions, promote roles, or expose expected answers.
 *
 * Required env:
 * SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY,
 * TEST_CANDIDATE_EMAIL, TEST_CANDIDATE_PASSWORD
 *
 * Optional engine/admin user (server-managed app_metadata role):
 * TEST_ENGINE_EMAIL, TEST_ENGINE_PASSWORD
 */
const env = process.env;
const required = [
  "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY",
  "TEST_CANDIDATE_EMAIL", "TEST_CANDIDATE_PASSWORD",
];
const missing = required.filter(name => !env[name]);
if (missing.length) {
  console.error("HTTP smoke test not executed: missing " + missing.join(", "));
  process.exitCode = 2;
} else {
  const base = new URL(env.SUPABASE_URL);
  if (base.protocol !== "https:") throw new Error("Require HTTPS for real Auth test");
  const key=env.SUPABASE_PUBLISHABLE_KEY;
  const apiBase=new URL("/functions/v1/question-bank/",base);

  async function login(email,password) {
    const authUrl=new URL("/auth/v1/token?grant_type=password",base);
    const response=await fetch(authUrl,{
      method:"POST",
      headers:{"content-type":"application/json",apikey:key},
      body:JSON.stringify({email,password}),
      redirect:"error",
    });
    if(!response.ok)throw new Error("Auth sign-in failed with HTTP "+response.status);
    const data=await response.json();
    if(!data.access_token||!data.user?.id)throw new Error("Missing verified user token");
    return {token:data.access_token,id:data.user.id};
  }

  async function request(path,token,method="GET",body) {
    const url=new URL(path,apiBase);
    const resp=await fetch(url,{
      method,redirect:"error",
      headers:{
        apikey:key,
        ...(token?{authorization:"Bearer "+token}:{}),
        ...(body!==undefined?{"content-type":"application/json"}:{}),
      },
      ...(body!==undefined?{body:JSON.stringify(body)}:{}),
    });
    const result=await resp.json().catch(()=>({}));
    return {status:resp.status,body:result};
  }

  function expect(result,status,label) {
    if(result.status!==status){
      throw new Error(label+" expected "+status+" got "+result.status);
    }
    console.log("PASS "+label+" ("+status+")");
  }

  const candidate=await login(env.TEST_CANDIDATE_EMAIL,env.TEST_CANDIDATE_PASSWORD);
  const noAuth=await request("questions");
  expect(noAuth,401,"No-token request is denied");

  expect(await request("questions?locale=fr",candidate.token),
    403,"Candidate cannot enumerate future interview questions");
  expect(await request("engine/snapshot/RH-001",candidate.token),
    403,"Candidate cannot read engine preview");
  expect(await request("evaluator/questions/RH-001",candidate.token),
    403,"Candidate cannot read evaluator reference");
  expect(await request("engine/sessions",candidate.token,"POST",
     {candidate_user_id:candidate.id,locale:"fr"}),
    403,"Candidate cannot open engine-managed session");

  if(env.TEST_ENGINE_EMAIL&&env.TEST_ENGINE_PASSWORD){
    const engine=await login(env.TEST_ENGINE_EMAIL,env.TEST_ENGINE_PASSWORD);
    const listing=await request("questions?locale=fr",engine.token);
    expect(listing,200,"Trusted engine can inspect published-only catalog");
    if(!Array.isArray(listing.body.items))throw new Error("Published catalog missing items array");
    for(const item of listing.body.items){
      for(const forbidden of ["expected_elements","weights","red_flags",
         "evaluation_notes","rubric_version_id","question_version_id"]){
        if(Object.hasOwn(item,forbidden))throw Error("Catalog leaked "+forbidden);
      }
    }

    const opened=await request("engine/sessions",engine.token,"POST",
      {candidate_user_id:candidate.id,locale:"fr"});
    expect(opened,201,"Engine can create persisted session");
    const sessionId=opened.body.session_id;
    if(!sessionId)throw Error("Missing session ID");
    const engineHistory=await request("engine/sessions/"+sessionId+"/questions",engine.token);
    expect(engineHistory,200,"Engine can replay persisted session");
    const ownHistory=await request("candidate/sessions/"+sessionId+"/questions",candidate.token);
    expect(ownHistory,200,"Candidate can read own question text");
    if(!Array.isArray(ownHistory.body.items))throw Error("Candidate history missing items");
    for(const item of ownHistory.body.items){
      for(const forbidden of ["rubric_version_id","question_version_id","expected_elements"]){
        if(Object.hasOwn(item,forbidden))throw Error("Candidate history leaked "+forbidden);
      }
    }
    if(listing.body.items.length){
      const next=await request("engine/sessions/"+sessionId+"/questions/next",
        engine.token,"POST",{family:listing.body.items[0].family});
      expect(next,201,"Engine persists next published question");
      if(!next.body.snapshot?.question_version_id)throw Error("Snapshot missing immutable version");
    }else{
      console.log("SKIP positive question selection: no human-approved published question");
    }
    console.log("Note: test session persists in Supabase; use dedicated synthetic accounts.");
  }else{
    console.log("SKIP engine flow: TEST_ENGINE_EMAIL/PASSWORD not configured");
  }

  console.log("HTTP smoke checks completed without publishing any question.");
}
