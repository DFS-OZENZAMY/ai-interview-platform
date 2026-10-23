import type { SupabaseClient } from "@supabase/supabase-js";

export type InterviewResult = {
 id:string; interview_kind:"rh"|"technical"; job_title:string|null;
 duration_minutes:number|null; status:"completed"|"partial";
 completed_at:string; score:number|null; score_eligible:boolean;
 coach_priority:string|null; coach_recommendation:string|null; report_path:string|null;
};

export async function readInterviewResults(client:SupabaseClient,userId:string):Promise<InterviewResult[]>{
 const {data,error}=await client.from("candidate_interview_results")
  .select("id,interview_kind,job_title,duration_minutes,status,completed_at,score,score_eligible,coach_priority,coach_recommendation,report_path")
  .eq("user_id",userId).order("completed_at",{ascending:false}).limit(50);
 // Before migration deployment, retain the first-use dashboard rather than inventing data.
 if(error?.code==="42P01"||error?.code==="PGRST205") return [];
 if(error) throw error;
 return (data??[]).map(row=>({...row,score:row.score_eligible&&row.score!==null?Number(row.score):null})) as InterviewResult[];
}

export function comparableProgress(results:InterviewResult[]){
 // Trend should compare only scored, completed interviews of the same kind.
 const scored=results.filter(r=>r.status==="completed"&&r.score!==null);
 const latest=scored[0];
 if(!latest)return {score:null,delta:null,kind:null};
 const previous=scored.slice(1).find(r=>r.interview_kind===latest.interview_kind);
 return {score:latest.score,delta:previous&&previous.score!==null?Math.round((latest.score!-previous.score)*10)/10:null,kind:latest.interview_kind};
}
