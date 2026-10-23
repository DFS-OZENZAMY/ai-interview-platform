import test from "node:test";
import assert from "node:assert/strict";
import { createInterviewSessionOrchestrator, NoPublishedQuestionsError } from
  "../src/interview-engine/session-orchestrator.mjs";

const candidate = "123e4567-e89b-42d3-a456-426614174001";
const sessionId = "123e4567-e89b-42d3-a456-426614174000";

test("engine starts an authenticated session using published catalogue",async()=>{
  const calls=[];
  const bank={
    listPublished:async(filters)=>{calls.push(["list",filters]);return {items:[{code:"RH-001"}]};},
    createSession:async(payload)=>{calls.push(["session",payload]);return {session_id:sessionId};},
    nextQuestion:async(id,filters)=>{calls.push(["next",id,filters]);return {snapshot:{
      question_version_id:"immutable-version",rubric_version_id:"immutable-rubric",
      locale:"fr",prompt_text:"Introduce yourself",turn_index:1}};},
    getSessionQuestions:async()=>({items:[]}),
    completeSession:async(sessionId)=>({session_id:sessionId,status:'completed'}),
  };
  const engine=createInterviewSessionOrchestrator(bank);
  const result=await engine.start({candidateUserId:candidate,locale:"fr",
    selection:{family:"rh",difficulty:1}});
  assert.equal(result.sessionId,sessionId);
  assert.equal(result.turn.question_version_id,"immutable-version");
  assert.deepEqual(calls.map(x=>x[0]),["list","session","next"]);
  assert.equal(calls[0][1].limit,1);
  assert.deepEqual(calls[2][2],{family:"rh",category:undefined,difficulty:1});
});

test("no published questions refuses to open empty session",async()=>{
  let wrote=false;
  const bank={
    listPublished:async()=>({items:[]}),
    createSession:async()=>{wrote=true;},
    nextQuestion:async()=>{throw Error("should not select");},
    getSessionQuestions:async()=>({items:[]}),
    completeSession:async(sessionId)=>({session_id:sessionId,status:'completed'}),
  };
  await assert.rejects(createInterviewSessionOrchestrator(bank).start({
    candidateUserId:candidate,selection:{family:"technical"},
  }),NoPublishedQuestionsError);
  assert.equal(wrote,false);
});

test("engine session replay consumes immutable database snapshots",async()=>{
  const saved={question_version_id:"stable-id",rubric_version_id:"stable-rubric",
    locale:"fr",prompt_text:"Question asked"};
  const bank={
    listPublished:async()=>({items:[{code:"RH-001"}]}),
    createSession:async()=>({session_id:sessionId}),
    nextQuestion:async()=>({snapshot:saved}),
    getSessionQuestions:async()=>({items:[saved]}),
    completeSession:async(sessionId)=>({session_id:sessionId,status:'completed'}),
  };
  const engine=createInterviewSessionOrchestrator(bank);
  assert.deepEqual(await engine.next(sessionId),saved);
  assert.deepEqual(await engine.replay(sessionId),[saved]);
  const result=await engine.finish(sessionId);
  assert.equal(result.status,"completed");
});

test("invalid filters reject before external API calls",async()=>{
  let touched=false;
  const bank={
    listPublished:async()=>{touched=true;},
    createSession:async()=>{},
    nextQuestion:async()=>{},
    getSessionQuestions:async()=>({items:[]}),
    completeSession:async(sessionId)=>({session_id:sessionId,status:'completed'}),
  };
  const engine=createInterviewSessionOrchestrator(bank);
  await assert.rejects(engine.start({candidateUserId:candidate,locale:"es"}),TypeError);
  await assert.rejects(engine.start({candidateUserId:candidate,selection:{difficulty:5}}),TypeError);
  await assert.rejects(engine.next(sessionId,{category:"../private"}),TypeError);
  assert.equal(touched,false);
});

test("missing secure adapter methods are rejected",()=>{
  assert.throws(()=>createInterviewSessionOrchestrator({listPublished:()=>({})}),TypeError);
});
