"use client";
import Link from "next/link";
import { VoicePoweredOrb } from "@/components/ui/voice-powered-orb";
import { CountdownTimer } from "@/components/ui/countdown-timer";
import {useEffect,useRef,useState} from "react";
import {ArrowLeft,Mic,Volume2,VolumeX,Pause,Play,Send,Check,AlertTriangle} from "lucide-react";
type Config={family:"rh"|"technical";locale:"fr"|"en";jobTitle:string;job_description:string;goals:string[];count:number};
type Response={session_id?:string;question?:{prompt:string};phase?:string;index?:number;total?:number;completed?:boolean;feedback?:string;transcript?:{question:string;answer:string}[];error?:string};
type Recognizer={lang:string;continuous:boolean;interimResults:boolean;onresult:((e:{results:ArrayLike<(ArrayLike<{transcript:string}> & {isFinal:boolean})>})=>void)|null;onerror:((e:{error:string})=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void};
type SpeechWindow=Window & {SpeechRecognition?:new()=>Recognizer;webkitSpeechRecognition?:new()=>Recognizer};
async function send(action:"start"|"answer",payload:object):Promise<Response>{
 const r=await fetch("/api/interview/"+action,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
 const data=await r.json() as Response;
 if(!r.ok)throw new Error(data.error||"Le moteur est indisponible.");
 return data;
}
function segmentInterviewerText(text:string):string[]{
 const sentences=text.match(/[^.!?…]+(?:[.!?…]+|$)/g)?.map(part=>part.trim()).filter(Boolean)||[];
 if(!sentences.length)return text.trim()?[text.trim()]:[];
 return sentences.flatMap(sentence=>{
  const tokens=sentence.split(/\s+/);
  if(tokens.length<=13)return [sentence];
  const segments:string[]=[];
  for(let index=0;index<tokens.length;index+=11)segments.push(tokens.slice(index,index+11).join(" "));
  return segments;
 });
}
export default function InterviewPage(){
 const [config,setConfig]=useState<Config|null>(null);
 const [configChecked,setConfigChecked]=useState(false);
 useEffect(()=>{
  // Read after hydration: the server-rendered page cannot access sessionStorage.
  let saved:Config|null=null;
  try{
   const raw=window.sessionStorage.getItem("interview-lab-config");
   if(raw){
    const item=JSON.parse(raw) as Partial<Config>;
    if((item.family==="rh"||item.family==="technical")&&(item.locale==="fr"||item.locale==="en")&&
      typeof item.jobTitle==="string"&&item.jobTitle.trim()&&Array.isArray(item.goals)&&item.goals.length&&
      typeof item.count==="number") saved=item as Config;
   }
  }catch{}
  queueMicrotask(()=>{setConfig(saved);setConfigChecked(true);});
 },[]);
 const [state,setState]=useState<"ready"|"speaking"|"listening"|"thinking"|"paused"|"done"|"error">("ready");
 const [result,setResult]=useState<Response|null>(null);
 const [session,setSession]=useState("");
 const [answer,setAnswer]=useState("");
 const [error,setError]=useState("");
 const [muted,setMuted]=useState(false);
 const [elapsed,setElapsed]=useState(0);
 const [stopOpen,setStopOpen]=useState(false);
 const [introStage,setIntroStage]=useState<"none"|"welcome"|"breathing"|"countdown"|"transition">("none");
 const [introReveal,setIntroReveal]=useState(0);
 const [introNotice,setIntroNotice]=useState("");
 const introAudio=useRef<HTMLAudioElement|null>(null);
 const introInterval=useRef<ReturnType<typeof setInterval>|null>(null);
 const introTransitionTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const introFinished=useRef(false);
 const introLine=config?.locale==="en"
  ?"I hope you're ready! Your interview will begin in five seconds. Good luck!"
  :"J’espère que vous êtes prêt ! Votre entretien commencera dans cinq secondes. Bonne chance !";
 const introPhrases=config?.locale==="en"
  ?["I hope you’re ready.","Your interview will begin in five seconds.","Good luck!"]
  :["J’espère que vous êtes prêt !","Votre entretien commencera dans cinq secondes.","Bonne chance !"];
 const recognition=useRef<Recognizer|null>(null);
 const questionAudio=useRef<HTMLAudioElement|null>(null);
 const questionAudioUrl=useRef<string|null>(null);
 const voiceSequence=useRef(0);
 function stopQuestionAudio(){
  voiceSequence.current++;
  questionAudio.current?.pause();questionAudio.current=null;
  if(questionAudioUrl.current){URL.revokeObjectURL(questionAudioUrl.current);questionAudioUrl.current=null;}
 }

 const sessionRef=useRef(false);
 const pausedFrom=useRef<"speaking"|"listening">("listening");
 const [dictating,setDictating]=useState(false);
 const [enhancedStt,setEnhancedStt]=useState(false);
 const [enhancedRecording,setEnhancedRecording]=useState(false);
 const recorderRef=useRef<MediaRecorder|null>(null);
 const [transcribing,setTranscribing]=useState(false);
 const dictationBase=useRef("");
 const answerRef=useRef("");
 const submittingRef=useRef(false);
 const silenceTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const autoListenRef=useRef<()=>void>(()=>{});
 const submitRef=useRef<(value:string)=>void>(()=>{});
 const [handsFree,setHandsFree]=useState(true);
 const handsFreeRef=useRef(true);
 const [speechHint,setSpeechHint]=useState("");
 const [voiceNotice,setVoiceNotice]=useState("");
 const [questionReveal,setQuestionReveal]=useState(0);
 function clearSilence(){if(silenceTimer.current){clearTimeout(silenceTimer.current);silenceTimer.current=null;}}
 function stopDictation(){clearSilence();const current=recognition.current;recognition.current=null;current?.stop();setDictating(false);}

 useEffect(()=>{const t=setInterval(()=>{if(sessionRef.current)setElapsed(s=>s+1)},1000);return()=>clearInterval(t)},[]);
 useEffect(()=>{sessionRef.current=["speaking","listening","thinking"].includes(state);},[state]);
 useEffect(()=>()=>{recognition.current?.stop();questionAudio.current?.pause();if(questionAudioUrl.current)URL.revokeObjectURL(questionAudioUrl.current);window.speechSynthesis?.cancel();if(introInterval.current)clearInterval(introInterval.current);if(introTransitionTimer.current)clearTimeout(introTransitionTimer.current);introAudio.current?.pause();if(silenceTimer.current)clearTimeout(silenceTimer.current);},[]);
 function speak(text:string,locale:string){
  stopDictation();stopQuestionAudio();setQuestionReveal(0);
  const total=segmentInterviewerText(text).length;
  if(muted){setQuestionReveal(total);setState("listening");setVoiceNotice("Le son est coupé.");return;}
  const sequence=voiceSequence.current;
  setState("speaking");
  setVoiceNotice("Chargement de la voix…");
  const url="/api/interview/tts?"+new URLSearchParams({text,locale}).toString();
  const audio=new Audio();
  audio.preload="auto";
  questionAudio.current=audio;
  audio.onplaying=()=>{
   if(sequence!==voiceSequence.current)return;
   setVoiceNotice("");
   setQuestionReveal(current=>Math.max(current,1));
  };
  audio.ontimeupdate=()=>{
   if(sequence!==voiceSequence.current||!Number.isFinite(audio.duration)||audio.duration<=0)return;
   const count=Math.max(1,Math.min(total,1+Math.floor((audio.currentTime/audio.duration)*total)));
   setQuestionReveal(current=>Math.max(current,count));
  };
  audio.onended=()=>{
   if(sequence!==voiceSequence.current)return;
   setQuestionReveal(total);stopQuestionAudio();setState("listening");setVoiceNotice("");
   if(handsFreeRef.current)queueMicrotask(()=>autoListenRef.current());
  };
  audio.onerror=()=>{
   if(sequence!==voiceSequence.current)return;
   setQuestionReveal(total);setState("listening");
   setVoiceNotice("La lecture a échoué. Essayez « Écouter la question ».");
  };
  audio.src=url;
  void audio.play().catch(()=>{
   if(sequence!==voiceSequence.current)return;
   setQuestionReveal(total);setState("listening");
   setVoiceNotice("Chrome a bloqué la lecture automatique. Cliquez sur « Écouter la question ».");
  });
 }
 function start(){
  if(!config){setError("Configuration introuvable. Revenez à la préparation.");return;}
  setError("");setIntroReveal(0);setIntroNotice("");
  introFinished.current=false;
  if(introInterval.current)clearInterval(introInterval.current);
  setIntroStage("welcome");
 }
 function finishIntroduction(){
  if(introFinished.current)return;
  introFinished.current=true;
  introAudio.current?.pause();
  if(introInterval.current)clearInterval(introInterval.current);
  setIntroNotice("");
  setIntroReveal(introPhrases.length);
  setIntroStage("breathing");
  if(introTransitionTimer.current)clearTimeout(introTransitionTimer.current);
  introTransitionTimer.current=setTimeout(()=>setIntroStage("countdown"),650);
 }
 function playIntro(){
  const audio=introAudio.current;
  if(!audio)return;
  audio.currentTime=0;
  void audio.play().then(()=>setIntroNotice("")).catch(()=>{
   setIntroNotice("Le navigateur bloque la lecture automatique. Cliquez sur « Écouter le message » pour lancer la voix.");
  });
 }
 useEffect(()=>{
  if(introStage!=="welcome")return;
  // Autoplay is opportunistic; an explicit user click remains available.
  const audio=introAudio.current;
  if(!audio)return;
  void audio.play().catch(()=>{
   setIntroNotice("Cliquez sur « Écouter le message » pour activer la voix.");
  });
 },[introStage]);
 // Launch the immersive introduction immediately when a configured interview opens.
 useEffect(()=>{
  if(!config||state!=="ready"||introStage!=="none")return;
  queueMicrotask(()=>start());
  // start intentionally depends on the loaded configuration, not on each render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[config]);
 function finishCountdown(){
  setIntroStage("transition");
  if(introTransitionTimer.current)clearTimeout(introTransitionTimer.current);
  introTransitionTimer.current=setTimeout(()=>void startInterview(),500);
 }
 async function startInterview(){
  setIntroStage("none");
  if(!config)return;
  setError("");setState("thinking");
  try{const data=await send("start",{family:config.family,locale:config.locale,goals:config.goals,count:config.count,warm_opening:true,job_description:config.job_description});
   setSession(data.session_id||"");setResult(data);speak(data.question?.prompt||"",config.locale);
  }catch(e){setError(e instanceof Error?e.message:"Impossible de lancer la simulation");setState("error");}
 }
 async function submitValue(value:string){
  if(!session||!value.trim()||submittingRef.current)return;
  submittingRef.current=true;
  stopDictation();
  stopQuestionAudio();window.speechSynthesis?.cancel();
  setState("thinking");setError("");setSpeechHint("");
  try{
   const data=await send("answer",{session_id:session,answer:value.trim()});
   setResult(data);setAnswer("");answerRef.current="";
   if(data.completed){setState("done");return;}
   speak(data.question?.prompt||"",config?.locale||"fr");
  }catch(e){
   setState("listening");setError(e instanceof Error?e.message:"Impossible de traiter votre réponse");
  }finally{submittingRef.current=false;}
 }

 function submit(){void submitValue(answerRef.current||answer);}
 async function recordEnhanced(){
  if(enhancedRecording){recorderRef.current?.stop();setEnhancedRecording(false);return;}
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){
   setError("Enregistrement audio non disponible dans ce navigateur.");return;
  }
  let stream:MediaStream|null=null;
  try{
   stream=await navigator.mediaDevices.getUserMedia({audio:true});
   const mime=["audio/webm","audio/mp4","audio/ogg"].find(type=>MediaRecorder.isTypeSupported(type));
   if(!mime)throw new Error("Format audio non pris en charge");
   const recordingStream=stream;
   const recorder=new MediaRecorder(recordingStream,{mimeType:mime});recorderRef.current=recorder;
   const chunks:Blob[]=[];
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   recorder.onstop=()=>{
    recordingStream.getTracks().forEach(track=>track.stop());
    setEnhancedRecording(false);
    if(!chunks.length)return;
    setTranscribing(true);setSpeechHint("Transcription multilingue en cours…");
    void (async()=>{
     try{
      const blob=new Blob(chunks,{type:mime});
      const base64=await new Promise<string>((resolve,reject)=>{
       const reader=new FileReader();
       reader.onload=()=>resolve(String(reader.result).split(",")[1]||"");
       reader.onerror=()=>reject(new Error("Lecture audio impossible"));
       reader.readAsDataURL(blob);
      });
      const res=await fetch("/api/interview/transcribe",{method:"POST",headers:{"Content-Type":"application/json"},
       body:JSON.stringify({audio:base64,mime,context:config?.jobTitle||""})});
      const data=await res.json() as {text?:string;error?:string};
      if(!res.ok||!data.text)throw new Error(data.error||"Transcription vide");
      answerRef.current=[answerRef.current,data.text].filter(Boolean).join(" ").slice(0,8000);
      setAnswer(answerRef.current);setSpeechHint("Transcription terminée : vérifiez le texte avant de répondre.");
     }catch(e){setError("Transcription multilingue indisponible : "+(e instanceof Error?e.message:"erreur"));}
     finally{setTranscribing(false);}
    })();
   };
   recorder.start();setEnhancedRecording(true);setError("");setSpeechHint("Enregistrement en cours : cliquez pour terminer.");
  }catch(e){stream?.getTracks().forEach(track=>track.stop());setError(e instanceof Error?e.message:"Microphone indisponible");}
 }
 function listen(automatic=false){
  const w=window as SpeechWindow;
  const C=w.SpeechRecognition||w.webkitSpeechRecognition;
  if(!C){
   if(!automatic)setError("Reconnaissance vocale non disponible dans ce navigateur. Vous pouvez répondre par écrit.");
   setSpeechHint("Dictée non disponible : utilisez le champ texte.");
   return;
  }
  if(recognition.current){
   if(!automatic)stopDictation();
   return;
  }
  dictationBase.current=answerRef.current.trim();
  const r=new C();recognition.current=r;
  r.lang=config?.locale==="en"?"en-US":"fr-FR";r.continuous=true;r.interimResults=true;
  r.onresult=e=>{
   if(recognition.current!==r)return;
   const results=Array.from(e.results);
   const spoken=results.map(x=>x[0]?.transcript||"").join(" ").trim();
   const combined=[dictationBase.current,spoken].filter(Boolean).join(" ").slice(0,8000);
   answerRef.current=combined;setAnswer(combined);clearSilence();
   const final=results.length>0&&results.every(x=>x.isFinal);
   // Wait for a completed recognition hypothesis and a meaningful silence.
   // Browser speech recognition is not a reliable VAD; the manual button remains available.
   if(automatic&&handsFreeRef.current&&final&&combined.trim().split(/\s+/).length>=4){
    setSpeechHint("Pause détectée : je vous laisse terminer votre idée…");
    silenceTimer.current=setTimeout(()=>{
     if(recognition.current===r&&!submittingRef.current&&handsFreeRef.current)
      submitRef.current(answerRef.current);
    },3200);
   }else if(automatic)setSpeechHint("Je vous écoute…");
  };
  r.onerror=e=>{
   clearSilence();if(recognition.current===r)recognition.current=null;
   setDictating(false);setSpeechHint("");
   setError("Microphone : "+e.error+". Vous pouvez aussi utiliser le champ texte.");
  };
  r.onend=()=>{
   clearSilence();
   if(recognition.current===r){recognition.current=null;setDictating(false);setSpeechHint("La dictée s’est arrêtée. Relancez-la si nécessaire.");}
  };
  try{r.start();setDictating(true);setError("");setSpeechHint(automatic?"Je vous écoute…":"Dictée active");setState("listening");}
  catch{recognition.current=null;setDictating(false);if(!automatic)setError("Impossible de démarrer le microphone.");}
 }
 useEffect(()=>{
  submitRef.current=(value)=>{void submitValue(value);};
  autoListenRef.current=()=>{if(!enhancedStt&&handsFreeRef.current&&!recognition.current)listen(true);};
 });
 function togglePause(){
  if(state==="paused"){
   if(pausedFrom.current==="speaking"&&questionAudio.current){void questionAudio.current.play();setState("speaking");}
   else if(pausedFrom.current==="speaking"&&"speechSynthesis" in window&&window.speechSynthesis.paused){
    window.speechSynthesis.resume();questionAudio.current?.play().catch(()=>{});setState("speaking");
   }else{setState("listening");}
   return;
  }
  if(state!=="speaking"&&state!=="listening")return;
  pausedFrom.current=state;
  stopDictation();
  if(state==="speaking"){questionAudio.current?.pause();if("speechSynthesis" in window)window.speechSynthesis.pause();}
  setState("paused");
 }
 function interrupt(){setQuestionReveal(segmentInterviewerText(result?.question?.prompt||"").length);stopQuestionAudio();window.speechSynthesis?.cancel();setState("listening");if(handsFreeRef.current)queueMicrotask(()=>autoListenRef.current());}
 const question=result?.question?.prompt;
 if(!configChecked || (config&&state==="ready"&&introStage==="none"))return <main role="status" className="flex min-h-dvh items-center justify-center bg-[#0C1436] text-sm font-semibold text-[#B8C8E8]">Préparation de votre entretien…</main>;
 if(introStage!=="none")return <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#0C1436] px-5 py-12 text-white">
  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,#334A96_0%,#18275A_36%,#0C1436_76%)]"/>
  <div className="pointer-events-none absolute -left-28 top-12 size-80 rounded-full bg-[#7669DF]/15 blur-[95px]"/>
  <div className="pointer-events-none absolute -right-20 bottom-8 size-80 rounded-full bg-[#36BCA8]/10 blur-[95px]"/>
  <div className="relative z-10 flex w-full max-w-3xl flex-col items-center text-center">
   <p className="text-xs font-semibold uppercase tracking-[.26em] text-[#AEBEF8]">AI Interview Platform</p>
   <p className="mt-3 text-sm text-[#B8C8E8]">{introStage==="welcome"||introStage==="breathing"?"Préparons votre entretien":"Vous entrez dans votre entretien"}</p>
   <div className="my-8 size-64 sm:size-80"><VoicePoweredOrb state={introStage==="welcome"?"speaking":"thinking"} voiceLevel={introStage==="welcome"?.25+.13*Math.sin(introReveal*1.6):.05} className="h-full w-full"/></div>
   {introStage==="welcome"&&<audio ref={introAudio} preload="auto" src={config?.locale==="en"?"/audio/interview-intro-en.mp3":"/audio/interview-intro-fr.mp3"}
    onPlay={()=>{
     setIntroNotice("");
     if(introInterval.current)clearInterval(introInterval.current);
     setIntroReveal(1);
     const audio=introAudio.current;
     introInterval.current=setInterval(()=>{
      if(!audio||audio.paused)return;
      const portion=audio.duration>0&&Number.isFinite(audio.duration)?audio.currentTime/audio.duration:0;
      setIntroReveal(Math.max(1,Math.min(introPhrases.length,1+Math.floor(portion*introPhrases.length))));
     },120);
    }}
    onEnded={finishIntroduction}
    onError={()=>setIntroNotice("Le fichier audio n’a pas pu être chargé. Vérifiez le navigateur ou continuez sans audio.")}/>}
   <div className={`relative flex min-h-36 w-full items-center justify-center transition-all duration-500 ${introStage==="transition"?"translate-y-3 opacity-0":"translate-y-0 opacity-100"}`}>
    {(introStage==="welcome"||introStage==="breathing")?
     <h1 aria-label={introLine} className="flex max-w-3xl flex-col items-center gap-3 text-balance text-center text-2xl font-semibold leading-snug tracking-[-.035em] sm:text-4xl">
      {introPhrases.map((phrase,index)=><span key={index} aria-hidden="true"
       className={`block transform-gpu transition-[opacity,transform,filter] duration-700 ease-out motion-reduce:transition-none ${introReveal>index?"translate-y-0 opacity-100 blur-none":"translate-y-3 opacity-0 blur-[6px]"} ${index===2?"text-[#D5DBFF]":"text-white"}`}>{phrase}</span>)}
     </h1>:
     introStage==="countdown"?<div key="countdown" className="animate-[fade-in_.5s_ease-out]"><CountdownTimer onComplete={finishCountdown}/></div>:null}
   </div>
   {introStage==="welcome"&&<div className="mt-5 flex flex-col items-center gap-3">
    {introNotice&&<p role="status" className="max-w-sm text-sm leading-6 text-[#CFDAF9]">{introNotice}</p>}
    <button type="button" onClick={playIntro} className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"><Volume2 size={17}/> Écouter le message</button>
    {introNotice&&<button type="button" onClick={finishIntroduction} className="text-xs text-[#C4D0F4] underline underline-offset-4">Continuer sans audio</button>}
   </div>}
   <p className="mt-8 text-xs font-medium tracking-[.12em] text-[#9CAED6]">{introStage==="welcome"||introStage==="breathing"?"UN INSTANT POUR VOUS METTRE À L’AISE":"L’INTERVIEWEUR PREND LA PAROLE DANS QUELQUES SECONDES"}</p>
  </div>
 </main>;
 return <main className="min-h-dvh bg-[#F5F7FC] px-4 py-8 text-[#18233D] sm:px-8">
  <div className="mx-auto max-w-5xl">
   <header className="flex flex-wrap items-center justify-between gap-4"><Link href="/preparation" className="inline-flex items-center gap-2 text-sm font-bold text-[#4965BC]"><ArrowLeft size={17}/> Configuration</Link><span className="rounded-full bg-[#E8ECFD] px-4 py-2 text-xs font-bold text-[#4D61AD]">Laboratoire vocal · Non noté</span></header>
   <div className="mt-9 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#6479B7]">Simulation {config?.family==="technical"?"technique":"RH"}</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Votre entretien IA</h1><p className="mt-2 text-sm text-[#657691]">{config?.jobTitle||(configChecked?"Configuration manquante":"Chargement de la configuration…")}</p></div><span className="text-sm font-semibold tabular-nums text-[#637493]">{Math.floor(elapsed/60).toString().padStart(2,"0")}:{(elapsed%60).toString().padStart(2,"0")}</span></div>
   <section className="mt-7 rounded-[28px] border border-[#DCE4F4] bg-white p-6 shadow-[0_18px_45px_rgba(43,67,128,.07)] sm:p-10">
    <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
     <div className="relative size-48 sm:size-56"><VoicePoweredOrb state={state} voiceLevel={dictating ? .55 : 0} className="h-full w-full"/><span className="sr-only">{state==="speaking"?"L’intervieweur parle":dictating?"Microphone actif":state==="listening"?"À vous de répondre":"Orbe d’entretien"}</span></div>
     <p className="mt-5 text-sm font-bold text-[#5266A6]">{({ready:"Prêt à commencer",speaking:"Votre intervieweur parle",listening:"À vous de répondre",thinking:"L'intervieweur prépare sa question",paused:"Entretien en pause",done:"Séance terminée",error:"Connexion indisponible"})[state]}</p>
     <div className="mt-6 flex min-h-24 w-full items-center justify-center">
      {question&&state!=="done"&&state!=="ready"?
       <h2 aria-label={question} className="flex max-w-2xl flex-col items-center gap-2 text-balance text-center text-xl font-semibold leading-relaxed tracking-tight sm:text-2xl">
        {segmentInterviewerText(question).map((phrase,index)=><span key={result?.session_id+"-"+(result?.index||0)+"-"+index} aria-hidden="true"
         className={`block transform-gpu transition-[opacity,transform,filter] duration-700 ease-out motion-reduce:transition-none ${questionReveal>index?"translate-y-0 opacity-100 blur-none":"translate-y-3 opacity-0 blur-[6px]"}`}>{phrase}</span>)}
       </h2>:
       <h2 className="text-xl font-semibold leading-9 tracking-tight sm:text-2xl">{state==="ready"?"Un entraînement oral adapté à votre configuration.":state==="done"?"Votre entretien est terminé.":"Préparation de la prochaine question…"}</h2>}
     </div>
     {state==="ready"&&introStage==="none"&&configChecked&&!config&&<div role="alert" className="mt-7 rounded-2xl border border-[#D4DDF3] bg-[#F4F7FF] p-5 text-left"><p className="text-sm text-[#526482]">Aucun entretien n’a été configuré pour cet onglet. Complétez d’abord les trois étapes pour activer le lancement.</p><Link href="/preparation" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#3456D7] px-5 py-3 text-sm font-bold text-white">Configurer mon entretien</Link></div>}
     {state==="error"&&<button onClick={()=>void startInterview()} className="mt-7 rounded-xl bg-[#3456D7] px-6 py-3 text-white">Réessayer</button>}
     {(state==="speaking"||state==="listening")&&question&&<button type="button" onClick={()=>{
      stopDictation();stopQuestionAudio();void speak(question,config?.locale||"fr");
     }} className="mt-5 rounded-xl border border-[#C8D4F0] bg-[#EEF2FF] px-5 py-3 text-sm font-semibold text-[#405ABA]"><Volume2 size={17} className="mr-2 inline"/> Écouter la question</button>}
     {voiceNotice&&<p role="status" className="mt-3 text-sm text-[#925A34]">{voiceNotice}</p>}
     {state==="speaking"&&<button onClick={interrupt} className="mt-7 rounded-xl border border-[#C8D4F0] px-5 py-3 text-sm font-semibold">Prendre la parole</button>}
     {(state==="listening"||state==="paused")&&<div className="mt-7 w-full text-left">
       <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F0F4FF] px-4 py-3 text-xs text-[#405BA8]">
        <span>{handsFree?"Mode mains libres actif":"Mode manuel actif"} · {speechHint||"Vous gardez le contrôle de votre réponse."}</span>
        <button type="button" className="font-bold underline underline-offset-4" onClick={()=>{
         const next=!handsFree;setHandsFree(next);handsFreeRef.current=next;clearSilence();
         if(next&&state==="listening"&&!recognition.current)listen(true);
        }}>{handsFree?"Passer en manuel":"Activer le mains libres"}</button>
       </div>
       <div className="mb-3 flex items-center justify-between gap-3 text-xs text-[#53658B]">
        <span>{enhancedStt?"Whisper : transcription multilingue après enregistrement":"Dictée instantanée Chrome"}</span>
        <button type="button" className="font-semibold underline underline-offset-4" onClick={()=>{stopDictation();if(recorderRef.current?.state==="recording")recorderRef.current.stop();setEnhancedStt(v=>!v);setSpeechHint("");}}>
         {enhancedStt?"Dictée instantanée":"Tester le STT multilingue"}
        </button>
       </div>
       <label htmlFor="spoken-answer" className="mb-2 block text-sm font-semibold">Votre réponse {dictating&&<span role="status" className="ml-2 text-[#21866F]">● Transcription en direct…</span>}</label>
       <textarea id="spoken-answer" value={answer} onChange={e=>{answerRef.current=e.target.value;setAnswer(e.target.value);clearSilence();}} disabled={state==="paused"} rows={4} maxLength={8000} placeholder="Parlez avec le microphone ou saisissez votre réponse…" className="w-full resize-y rounded-xl border border-[#D2DBEC] bg-[#FBFCFF] p-4 text-sm leading-7 outline-none focus:border-[#5E77DA] disabled:opacity-60"/>
       <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button disabled={state==="paused"||transcribing} onClick={()=>enhancedStt?void recordEnhanced():listen(false)} className="flex items-center gap-2 rounded-xl border border-[#C9D9ED] px-4 py-3 text-sm font-semibold disabled:opacity-50"><Mic size={18}/> {enhancedStt?(transcribing?"Transcription en cours…":enhancedRecording?"Arrêter l’enregistrement":"Enregistrer ma réponse"):(dictating?"Arrêter la dictée":"Dicter ma réponse")}</button>
        <button disabled={!answer.trim()||state==="paused"||transcribing||enhancedRecording} onClick={submit} className="flex items-center gap-2 rounded-xl bg-[#3456D7] px-5 py-3 text-sm font-bold text-white disabled:opacity-40">J’ai terminé <Send size={17}/></button>
       </div>
      </div>}
     {state==="done"&&<div className="mt-7 w-full rounded-2xl bg-[#EFF8F3] p-6 text-left"><div className="flex items-center gap-2 font-bold text-[#247B64]"><Check size={18}/> Bilan pédagogique non noté</div><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#435C56]">{result?.feedback||"Aucun retour disponible."}</p><p className="mt-3 text-xs text-[#65766F]">Cette session locale n’est pas enregistrée dans Supabase et ne met pas encore à jour le dashboard.</p></div>}
     {error&&<p role="alert" className="mt-5 rounded-xl bg-[#FFF0ED] p-3 text-sm text-[#A64040]"><AlertTriangle size={16} className="mr-2 inline"/>{error}</p>}
    </div>
   </section>
   {["speaking","listening","paused"].includes(state)&&<div className="mt-6 flex flex-wrap items-center justify-center gap-3">
    <button onClick={()=>{setMuted(x=>!x);if(!muted&&state==="speaking"){stopQuestionAudio();window.speechSynthesis?.cancel();setState("listening");}}} className="flex items-center gap-2 rounded-xl border border-[#D4DEEE] bg-white px-4 py-3 text-sm">{muted?<VolumeX size={18}/>:<Volume2 size={18}/>} {muted?"Son coupé":"Son activé"}</button>
    <button onClick={togglePause} className="flex items-center gap-2 rounded-xl border border-[#D4DEEE] bg-white px-4 py-3 text-sm">{state==="paused"?<Play size={18}/>:<Pause size={18}/>} {state==="paused"?"Reprendre":"Pause"}</button>
    <button onClick={()=>setStopOpen(true)} className="rounded-xl border border-[#F0CCD0] bg-white px-4 py-3 text-sm font-medium text-[#AA4050]">Terminer</button>
   </div>}
   {stopOpen&&<div role="dialog" aria-modal="true" aria-label="Terminer l’entretien" className="mx-auto mt-5 max-w-md rounded-2xl border border-[#F0CCD0] bg-white p-6"><h3 className="font-bold">Terminer cette séance ?</h3><p className="mt-2 text-sm text-[#6C7890]">Les réponses en cours ne pourront pas être conservées et aucun bilan partiel ne sera produit par le laboratoire actuel.</p><div className="mt-5 flex gap-3"><button onClick={()=>setStopOpen(false)} className="rounded-xl border px-4 py-2">Continuer</button><button onClick={()=>{stopDictation();stopQuestionAudio();window.speechSynthesis?.cancel();setStopOpen(false);setResult({completed:true,feedback:"Séance interrompue volontairement. Le laboratoire ne permet pas encore de produire ni de conserver un bilan partiel."});setState("done");}} className="rounded-xl bg-[#A64D58] px-4 py-2 font-bold text-white">Terminer</button></div></div>}
   <p className="mt-7 text-center text-xs leading-6 text-[#7786A0]">Prototype local : questions issues du corpus brouillon ; reconnaissance vocale selon le navigateur ; aucune évaluation chiffrée.</p>
  </div>
 </main>;
}
