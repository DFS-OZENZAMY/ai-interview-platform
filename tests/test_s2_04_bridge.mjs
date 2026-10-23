import test from "node:test";
import assert from "node:assert/strict";
import { createQuestionBankClient, QuestionBankApiError } from "../src/integrations/s2-04/question-bank-client.mjs";

test("published list sends bearer token and safe filters", async () => {
  const calls = [];
  const api = createQuestionBankClient({
    baseUrl: "https://example.supabase.co/functions/v1/question-bank",
    tokenProvider: async () => "server-user-token",
    fetchImpl: async (url, init) => {
      calls.push({url, init});
      return {ok: true, json: async () => ({items: [], next_cursor: null})};
    },
  });
  const result = await api.listPublished({locale:"fr", family:"technical", difficulty:2});
  assert.deepEqual(result, {items:[], next_cursor:null});
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /questions\?locale=fr&family=technical&difficulty=2/);
  assert.equal(calls[0].init.headers.authorization, "Bearer server-user-token");
  assert.equal(calls[0].init.cache, "no-store");
});

test("engine snapshot endpoint includes immutable reference by code", async () => {
  let request;
  const api = createQuestionBankClient({
    baseUrl:"https://example.supabase.co/functions/v1/question-bank/",
    tokenProvider:async()=>"jwt",
    fetchImpl:async(url)=>{request=url; return {ok:true,json:async()=>({snapshot:{code:"RH-004",question_version_id:"id"}})};},
  });
  const result = await api.getEngineSnapshot("RH-004","en");
  assert.match(request,/engine\/snapshot\/RH-004\?locale=en$/);
  assert.equal(result.snapshot.code,"RH-004");
});

test("evaluator path is independent from candidate path", async () => {
  let request;
  const api = createQuestionBankClient({
    baseUrl:"https://example.supabase.co/functions/v1/question-bank",
    tokenProvider:async()=>"jwt",
    fetchImpl:async(url)=>{request=url;return {ok:true,json:async()=>({reference:{expected_elements:[]}})};},
  });
  await api.getEvaluatorReference("TECH-003");
  assert.match(request,/evaluator\/questions\/TECH-003\?locale=fr$/);
});

test("missing token never reaches network", async () => {
  let called=false;
  const api=createQuestionBankClient({
    baseUrl:"https://example.supabase.co/functions/v1/question-bank",
    tokenProvider:async()=>"",
    fetchImpl:async()=>{called=true;throw Error("should not happen");},
  });
  await assert.rejects(api.listPublished(), e=>e instanceof QuestionBankApiError && e.status===401);
  assert.equal(called,false);
});

test("forbidden response is surfaced without guessing a role", async () => {
  const api=createQuestionBankClient({
    baseUrl:"https://example.supabase.co/functions/v1/question-bank",
    tokenProvider:async()=>"jwt",
    fetchImpl:async()=>({ok:false,status:403}),
  });
  await assert.rejects(api.getEngineSnapshot("RH-004"),e=>e instanceof QuestionBankApiError&&e.status===403);
});

test("malformed codes rejected before network access", async () => {
  const api=createQuestionBankClient({
    baseUrl:"https://example.supabase.co/functions/v1/question-bank",
    tokenProvider:async()=>"jwt",
    fetchImpl:async()=>{throw Error("should not happen");},
  });
  assert.throws(()=>api.getEngineSnapshot("../admin"),TypeError);
  assert.throws(()=>api.getEvaluatorReference("TECH-1"),TypeError);
});

const sessionId = "123e4567-e89b-42d3-a456-426614174000";
const candidateId = "123e4567-e89b-42d3-a456-426614174001";

test("S2-04 opens a verified interview session and captures candidate identity", async () => {
  let request;
  const api=createQuestionBankClient({
    baseUrl:"https://example.supabase.co/functions/v1/question-bank",
    tokenProvider:async()=>"signed-test-jwt",
    fetchImpl:async(url,init)=>{request={url,init};return {ok:true,status:201,json:async()=>({session_id:sessionId,locale:"fr"})};},
  });
  const response=await api.createSession({candidate_user_id:candidateId,locale:"fr"});
  assert.equal(response.session_id,sessionId);
  assert.match(request.url,/question-bank\/engine\/sessions$/);
  assert.equal(request.init.method,"POST");
  assert.deepEqual(JSON.parse(request.init.body),{candidate_user_id:candidateId,locale:"fr"});
  assert.equal(request.init.headers.authorization,"Bearer signed-test-jwt");
});

test("S2-04 selects next published question and preserves server-provided snapshot",async()=>{
  let request;
  const api=createQuestionBankClient({
    baseUrl:"https://example.supabase.co/functions/v1/question-bank",
    tokenProvider:async()=>"signed-jwt",
    fetchImpl:async(url,init)=>{request={url,init};return {ok:true,status:201,json:async()=>({
      snapshot:{question_version_id:"immutable-version",rubric_version_id:"immutable-rubric",
                locale:"en",prompt_text:"Tell me about...",turn_index:1}})};},
  });
  const r=await api.nextQuestion(sessionId,{family:"rh",difficulty:2});
  assert.match(request.url,/engine\/sessions\/123e4567-e89b-42d3-a456-426614174000\/questions\/next$/);
  assert.equal(request.init.method,"POST");
  assert.deepEqual(JSON.parse(request.init.body),{family:"rh",difficulty:2});
  assert.equal(r.snapshot.question_version_id,"immutable-version");
  assert.equal(r.snapshot.turn_index,1);
});

test("S2-04 supports explicit published-question assignment and session replay",async()=>{
  const requests=[];
  const api=createQuestionBankClient({
    baseUrl:"https://example.supabase.co/functions/v1/question-bank",
    tokenProvider:async()=>"signed-jwt",
    fetchImpl:async(url,init)=>{requests.push({url,method:init.method});return {ok:true,json:async()=>({items:[]})};},
  });
  await api.appendQuestion(sessionId,"TECH-003");
  await api.getSessionQuestions(sessionId);
  await api.getCandidateQuestions(sessionId);
  assert.match(requests[0].url,/engine\/sessions\/.*\/questions$/);
  assert.equal(requests[0].method,"POST");
  assert.match(requests[1].url,/engine\/sessions\/.*\/questions$/);
  assert.equal(requests[1].method,"GET");
  assert.match(requests[2].url,/candidate\/sessions\/.*\/questions$/);
});

test("reject invalid session IDs before network activity",async()=>{
  const api=createQuestionBankClient({
    baseUrl:"https://example.supabase.co/functions/v1/question-bank",
    tokenProvider:async()=>"jwt",
    fetchImpl:async()=>{throw Error("request should never be sent");},
  });
  assert.throws(()=>api.nextQuestion("../sessions",{}),TypeError);
  assert.throws(()=>api.getCandidateQuestions("fake-id"),TypeError);
  assert.throws(()=>api.appendQuestion(sessionId,"TECH-../../etc"),TypeError);
});

test("S2-04 adapter surfaces unauthorized HTTP denial",async()=>{
  const api=createQuestionBankClient({
    baseUrl:"https://example.supabase.co/functions/v1/question-bank",
    tokenProvider:async()=>"expired-token",
    fetchImpl:async()=>({ok:false,status:401}),
  });
  await assert.rejects(api.createSession({candidate_user_id:candidateId}),
    e=>e instanceof QuestionBankApiError && e.status===401);
});

test("S2-04 closes an interview through authenticated POST",async()=>{
  let request;
  const api=createQuestionBankClient({
    baseUrl:"https://example.supabase.co/functions/v1/question-bank",
    tokenProvider:async()=>"jwt",
    fetchImpl:async(url,init)=>{
      request={url,init};return {ok:true,json:async()=>({session_id:sessionId,status:"completed"})};
    },
  });
  const result=await api.completeSession(sessionId);
  assert.equal(result.status,"completed");
  assert.equal(request.init.method,"POST");
  assert.match(request.url,/engine\/sessions\/.*\/complete$/);
});
