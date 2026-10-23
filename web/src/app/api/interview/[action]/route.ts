import { NextRequest, NextResponse } from "next/server";
import { getServerAuthClient } from "@/lib/supabase-server";
import { getAppRole } from "@/lib/profile";
const UPSTREAM = "http://127.0.0.1:8765";
export async function GET(request:NextRequest,{params}:{params:Promise<{action:string}>}){
 const {action}=await params;
 if(action!=="tts")return NextResponse.json({error:"Action inconnue"},{status:404});
 const client=await getServerAuthClient();
 if(!client)return NextResponse.json({error:"Authentification indisponible"},{status:503});
 const {data:{user}}=await client.auth.getUser();
 if(!user)return NextResponse.json({error:"Connectez-vous pour lancer l’entretien."},{status:401});
 if(await getAppRole(client,user.id)!=="user")return NextResponse.json({error:"Accès candidat uniquement"},{status:403});
 const text=request.nextUrl.searchParams.get("text")||"";
 const locale=request.nextUrl.searchParams.get("locale")||"fr";
 if(!text.trim()||text.length>1200||!["fr","en"].includes(locale))
  return NextResponse.json({error:"Texte vocal invalide"},{status:400});
 try{
  const response=await fetch(`${UPSTREAM}/api/ai/tts`,{method:"POST",headers:{"content-type":"application/json"},
   body:JSON.stringify({text,locale}),cache:"no-store",signal:AbortSignal.timeout(35000)});
  if(!response.ok)return NextResponse.json({error:"Synthèse vocale locale indisponible"},{status:503});
  return new NextResponse(await response.arrayBuffer(),{headers:{"Content-Type":"audio/mpeg","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
 }catch{return NextResponse.json({error:"Serveur vocal indisponible"},{status:503});}
}
export async function POST(request:NextRequest,{params}:{params:Promise<{action:string}>}){
 const {action}=await params;
 if(action!=="start"&&action!=="answer"&&action!=="tts"&&action!=="transcribe")return NextResponse.json({error:"Action inconnue"},{status:404});
 const origin=request.headers.get("origin");
 if(origin&&origin!==request.nextUrl.origin)return NextResponse.json({error:"Origine non autorisée"},{status:403});
 const client=await getServerAuthClient();
 if(!client)return NextResponse.json({error:"Authentification indisponible"},{status:503});
 const {data:{user}}=await client.auth.getUser();
 if(!user)return NextResponse.json({error:"Connectez-vous pour lancer l’entretien."},{status:401});
 if(await getAppRole(client,user.id)!=="user")return NextResponse.json({error:"Accès candidat uniquement"},{status:403});
 let payload:unknown;try{payload=await request.json();}catch{return NextResponse.json({error:"Données invalides"},{status:400});}
 if(!payload||typeof payload!=="object"||Array.isArray(payload))return NextResponse.json({error:"Données invalides"},{status:400});
 try{
  const response=await fetch(`${UPSTREAM}/api/ai/session/${action}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload),cache:"no-store",signal:AbortSignal.timeout(35000)});
  if(action==="tts"){
   if(!response.ok)return NextResponse.json({error:"Synthèse vocale locale indisponible."},{status:response.status});
   return new NextResponse(await response.arrayBuffer(),{status:200,headers:{"Content-Type":"audio/mpeg","Cache-Control":"no-store"}});
  }
  const text=await response.text();
  let result:unknown;try{result=JSON.parse(text);}catch{throw new Error("Réponse IA invalide");}
  return NextResponse.json(result,{status:response.status,headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Moteur local indisponible. Lancez le laboratoire IA sur ce Mac."},{status:503});}
}
