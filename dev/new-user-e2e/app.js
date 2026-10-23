const $ = id => document.getElementById(id);
const STEPS = ["welcome","auth","onboarding","dashboard","configure","interview","recap"];
const GOALS = {
  first_job:"Premier emploi", job_change:"Changer de poste", career_growth:"Évoluer",
};
const PREP = {
  confidence:"Confiance en soi", answer_structure:"Structurer mes réponses comportementales",
  communication:"Communication en entretien RH", domain_knowledge:"Connaissances métier",
  stress_management:"Gestion du stress en entretien RH",
  rh_motivation:"Motivations et projet professionnel",
  rh_parcours:"Présenter et valoriser mon parcours",
  rh_teamwork:"Collaboration et travail en équipe",
  rh_leadership:"Leadership et influence",
  rh_behavioral:"Situations vécues et méthode STAR",
  rh_conflict:"Gestion des désaccords et conflits",
  tech_fundamentals:"Fondamentaux techniques",
  tech_problem_solving:"Résolution de problèmes techniques",
  tech_architecture:"Architecture et conception",
  tech_debugging:"Débogage et investigation",
  tech_practices:"Qualité et bonnes pratiques",
  tech_reasoning:"Structuration du raisonnement",
  tech_explain:"Expliquer clairement mes choix techniques",
  tech_incident:"Diagnostic et gestion d'incident",
  tech_sql:"SQL, requêtes et optimisation",
  tech_data_pipelines:"ETL, pipelines et qualité des données",
  tech_ml:"Machine learning et IA",
  tech_api:"API, backend et intégrations",
  tech_system_design:"Conception et scalabilité des systèmes",
  tech_cloud:"Cloud, infrastructure et conteneurs",
  tech_cicd:"CI/CD et déploiements",
  tech_observability:"Monitoring et observabilité",
  tech_security:"Sécurité applicative et vulnérabilités",
  tech_threat_model:"Analyse de risques et menaces",
  tech_iam:"Identités, accès et IAM",
  tech_automation:"Automatisation des tests",
  tech_quality:"Qualité, anomalies et stratégie QA",
  tech_test_strategy:"Conception de scénarios de test",
  tech_requirements:"Analyse et cadrage des besoins",
  tech_user_stories:"User stories et critères d'acceptation",
  tech_stakeholders:"Ateliers et gestion des parties prenantes",
};
const RH_SIM_GOALS = [
  "rh_motivation","rh_parcours","communication","answer_structure",
  "rh_teamwork","rh_leadership","rh_behavioral","rh_conflict",
  "confidence","stress_management",
];
const TECH_SIM_GOALS = [
  "tech_fundamentals","tech_problem_solving","tech_architecture",
  "tech_debugging","tech_practices","tech_reasoning",
  "tech_explain","tech_incident",
];
const TECH_DOMAIN_GOALS = {
  software:["tech_api","tech_system_design"],
  data_ai:["tech_sql","tech_data_pipelines","tech_ml"],
  cloud_devops:["tech_cloud","tech_cicd","tech_observability"],
  cybersecurity:["tech_security","tech_threat_model","tech_iam"],
  testing_qa:["tech_automation","tech_quality","tech_test_strategy"],
  business_analysis:["tech_requirements","tech_user_stories","tech_stakeholders"],
};
const state = {
  mode:"demo", liveConfig:null, page:"welcome", authMode:"signup",
  user:null, accessToken:null, profile:null, selectedGoals:[],
  selection:null, questions:[], answers:[], index:0,
  aiReady:false, aiProvider:null, aiSession:null, aiTotal:0, aiPhase:"primary",
  aiCurrentQuestion:null, aiFeedback:null,
  simGoalSelections:{}, lastRenderedFamily:null,
};
function show(page) {
  state.page = page;
  for(const name of STEPS) $(name).classList.toggle("hidden", name!==page);
  const index=STEPS.indexOf(page);
  for(const step of document.querySelectorAll(".step")){
    const i=STEPS.indexOf(step.dataset.step);
    step.classList.toggle("active", i===index);
    step.classList.toggle("done", i<index);
  }
  window.scrollTo(0,0);
}
function text(id,value){ $(id).textContent=String(value??""); }
function error(id,e){text(id,e instanceof Error?e.message:e);}
function names(list){return (list||[]).map(v=>PREP[v]||v).join(" · ")||"Aucun";}

async function jsonResponse(url,init={}){
  const response=await fetch(url,{...init,redirect:"error",cache:"no-store"});
  const body=await response.json().catch(()=>({}));
  if(!response.ok){
    const message=body.msg||body.error_description||body.message||body.error||
      "Service indisponible (HTTP "+response.status+")";
    throw new Error(typeof message==="string"?message:"Erreur de connexion");
  }
  return body;
}
function authHeaders(accessToken=null){
  const key=state.liveConfig?.publishable_key;
  if(!key)throw new Error("Supabase n'est pas configuré");
  return {
    apikey:key,"content-type":"application/json",
    ...(accessToken?{authorization:"Bearer "+accessToken}:{})
  };
}
function supabasePath(path){
  const base=state.liveConfig?.supabase_url;
  if(!base || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base))
    throw new Error("URL Supabase invalide");
  return base+path;
}
async function verifyAuth(accessToken){
  return jsonResponse(supabasePath("/auth/v1/user"),{
    headers:authHeaders(accessToken),
    method:"GET",headers:{...authHeaders(accessToken)},
  });
}
async function loadProfile(){
  const user=state.user;
  const query="/rest/v1/candidate_profiles?user_id=eq."+encodeURIComponent(user.id)+"&select=*";
  const profiles=await jsonResponse(supabasePath(query),{
    method:"GET",headers:authHeaders(state.accessToken),
  });
  return profiles[0]||null;
}
async function saveProfile(profile){
  if(state.mode==="demo"){
    state.profile={...profile,user_id:state.user.id,onboarding_completed_at:new Date().toISOString()};
    sessionStorage.setItem("ai_e2e_demo_profile",JSON.stringify({
      email:state.user.email,profile:state.profile
    }));
    return;
  }
  const payload={
    user_id:state.user.id,
    professional_goal:profile.professional_goal,
    preparation_goals:profile.preparation_goals,
    target_role:profile.target_role||null,
    preferred_locale:profile.preferred_locale,
  };
  const rows=await jsonResponse(supabasePath("/rest/v1/candidate_profiles?on_conflict=user_id"),{
    method:"POST",
    headers:{...authHeaders(state.accessToken),
      Prefer:"resolution=merge-duplicates,return=representation"},
    body:JSON.stringify(payload),
  });
  if(!Array.isArray(rows)||rows.length!==1)throw Error("Impossible de confirmer l'enregistrement du profil");
  state.profile=rows[0];
}

function enterAuth(mode){
  state.mode=mode;state.authMode="signup";renderAuth();
  text("modeIndicator",mode==="demo"?"DÉMO · DONNÉES LOCALES":"SUPABASE · INSCRIPTION RÉELLE");
  show("auth");
}
function renderAuth(){
  const live=state.mode==="live",signup=state.authMode==="signup";
  text("authHeading",signup?"Créer mon compte":"Se connecter");
  text("authSub",live
    ? "Supabase Auth : votre compte et vos objectifs seront réellement enregistrés dans le projet de développement."
    : "Mode démo : compte fictif, aucune inscription et aucune donnée envoyée à Supabase.");
  text("authSubmit",signup?"Créer mon compte →":"Se connecter →");
  text("toggleAuth",signup?"Déjà inscrit ? Se connecter":"Créer un compte");
  $("password").setAttribute("autocomplete",signup?"new-password":"current-password");
  $("emailPending").classList.add("hidden");text("authError","");
}
async function doAuth(event){
  event.preventDefault();text("authError","");
  const email=$("email").value.trim().toLowerCase();
  const password=$("password").value;
  if(!email.includes("@")||password.length<8){error("authError","Saisissez un e-mail valide et au moins 8 caractères.");return;}
  $("authSubmit").disabled=true;
  try{
    if(state.mode==="demo"){
      const saved=JSON.parse(sessionStorage.getItem("ai_e2e_demo_profile")||"null");
      state.user={id:"demo-new-user",email};
      if(state.authMode==="login"&&saved?.email===email){
        state.profile=saved.profile;renderDashboard();show("dashboard");
      }else{
        state.profile=null;renderOnboarding();show("onboarding");
      }
      return;
    }
    const signup=state.authMode==="signup";
    const endpoint=signup?"/auth/v1/signup":"/auth/v1/token?grant_type=password";
    const result=await jsonResponse(supabasePath(endpoint),{
      method:"POST",headers:authHeaders(),body:JSON.stringify({email,password}),
    });
    if(!result.access_token){
      $("emailPending").classList.remove("hidden");
      text("authError","Confirmation e-mail requise. Vérifiez votre messagerie puis connectez-vous.");
      return;
    }
    state.accessToken=result.access_token;
    const verified=await verifyAuth(result.access_token);
    state.user={id:verified.id,email:verified.email||email};
    const savedProfile=await loadProfile();
    if(savedProfile){state.profile=savedProfile;renderDashboard();show("dashboard");}
    else{state.profile=null;renderOnboarding();show("onboarding");}
  }catch(e){error("authError",e);}finally{$("authSubmit").disabled=false;}
}
function chosenPrep(container){return [...$(container).querySelectorAll('input[type="checkbox"]:checked')].map(x=>x.value);}
function renderOnboarding(){
  const p=state.profile;
  for(const option of $("professionalOptions").querySelectorAll("input")){
    option.checked=p?.professional_goal===option.value;
    option.closest(".choice").classList.toggle("selected",option.checked);
  }
  for(const option of $("preparationOptions").querySelectorAll("input")){
    option.checked=(p?.preparation_goals||[]).includes(option.value);
    option.closest(".choice").classList.toggle("selected",option.checked);
  }
  $("targetRole").value=p?.target_role||"";
  $("preferredLocale").value=p?.preferred_locale||"fr";
  text("onboardingError","");
}
async function submitOnboarding(event){
  event.preventDefault();
  text("onboardingError","");
  const professional_goal=$('onboardingForm').querySelector('input[name="professionalGoal"]:checked')?.value;
  const preparation_goals=chosenPrep("preparationOptions");
  if(!professional_goal){error("onboardingError","Sélectionnez un objectif professionnel.");return;}
  if(!preparation_goals.length){error("onboardingError","Sélectionnez au moins un objectif de préparation.");return;}
  const payload={professional_goal,preparation_goals,
    target_role:$("targetRole").value.trim()||null,
    preferred_locale:$("preferredLocale").value};
  $("saveProfile").disabled=true;
  try{await saveProfile(payload);renderDashboard();show("dashboard");}
  catch(e){error("onboardingError",e);}
  finally{$("saveProfile").disabled=false;}
}
function renderDashboard(){
  text("profileMode",state.mode==="demo"?"PROFIL DÉMO · TEMPORAIRE":"PROFIL RÉEL · RLS");
  text("profileEmail",state.user.email);
  text("profileGoal",GOALS[state.profile.professional_goal]||state.profile.professional_goal);
  text("profilePrep",names(state.profile.preparation_goals));
  text("profileRole",state.profile.target_role||"Non renseigné");
  text("dashboardNotice",state.mode==="demo"
    ? "En mode démo, vous pouvez parcourir toutes les étapes avec des questions brouillon issues de votre référentiel local. Pas de notation IA."
    : "Votre profil est enregistré dans Supabase. Aucune question n'est encore publiée dans le catalogue réel : la simulation complète reste bloquée.");
}
function defaultGoalsForFamily(family){
  const saved=state.profile?.preparation_goals||[];
  if(family==="rh"){
    const selected=saved.filter(goal=>RH_SIM_GOALS.includes(goal));
    return selected.length?selected:["rh_motivation"];
  }
  const mapped=[];
  const map={
    domain_knowledge:"tech_fundamentals",
    communication:"tech_explain",
    answer_structure:"tech_reasoning",
    confidence:"tech_problem_solving",
    stress_management:"tech_incident",
  };
  for(const goal of saved)if(map[goal]&&!mapped.includes(map[goal]))mapped.push(map[goal]);
  return mapped.length?mapped:["tech_fundamentals","tech_problem_solving"];
}
function rememberCurrentSimulationGoals(){
  if(state.lastRenderedFamily){
    state.simGoalSelections[state.lastRenderedFamily]=chosenPrep("simulationGoals");
  }
}
function renderSimulationGoals(){
  const family=$("simFamily").value;
  const technical=family==="technical";
  const base=technical?TECH_SIM_GOALS:RH_SIM_GOALS;
  const domainGoals=technical?(TECH_DOMAIN_GOALS[$("simDomain").value]||[]):[];
  const allowed=[...base,...domainGoals];
  const stored=state.simGoalSelections[family]||defaultGoalsForFamily(family);
  let selected=stored.filter(value=>allowed.includes(value));
  if(!selected.length){
    const suggested=defaultGoalsForFamily(family).filter(v=>allowed.includes(v));
    selected=suggested.length?suggested:[base[0]];
  }
  $("simDomainWrap").classList.toggle("hidden",!technical);
  text("simGoalsTitle",technical?"Objectifs de préparation technique":"Objectifs de préparation RH");
  text("simGoalsHint",technical
    ?"Choisissez des thèmes techniques adaptés à la spécialité sélectionnée."
    :"Travaillez les motivations, le parcours et les situations comportementales.");
  const container=$("simulationGoals");container.replaceChildren();
  for(const code of allowed){
    const item=document.createElement("label");item.className="choice";
    const checkbox=document.createElement("input");checkbox.type="checkbox";
    checkbox.value=code;checkbox.checked=selected.includes(code);
    item.classList.toggle("selected",checkbox.checked);
    const bold=document.createElement("b");bold.textContent=PREP[code]||code;
    item.append(checkbox,bold);container.append(item);
  }
  state.lastRenderedFamily=family;
}
function renderAIMode(){
  const ai=$("simMode").value==="ai";
  $("aiPrivacyWrap").classList.toggle("hidden",!ai);
  const providerLabel=state.aiProvider==="groq"?"Groq":state.aiProvider==="openai"?"OpenAI":"fournisseur IA";
  text("aiModeHint",ai
    ?"Mode IA actif avec "+providerLabel+" : les réponses sont envoyées au fournisseur depuis le serveur local, avec votre accord. Les questions brouillon restent non publiées."
    :"Démo guidée sans IA. Les questions brouillon sont visibles uniquement dans ce laboratoire local.");
}
function renderConfiguration(){
  state.aiSession=null;
  state.aiFeedback=null;
  state.simGoalSelections={};
  state.lastRenderedFamily=null;
  $("simDifficulty").value="";
  $("simJobDescription").value="";
  $("simFamily").value="rh";
  $("simDomain").value="software";
  $("simCount").value="3";
  $("simMode").value=state.aiReady?"ai":"guided";
  $("aiPrivacyConsent").checked=false;
  renderSimulationGoals();
  renderAIMode();
  text("configurationError","");
}
async function startSimulation(event){
  event.preventDefault();text("configurationError","");
  const simGoals=chosenPrep("simulationGoals");
  if(!simGoals.length){
    error("configurationError","Choisissez au moins un sujet pour cet entretien.");return;
  }
  const type=$("simMode").value;
  if(type==="ai"&&!state.aiReady){
    error("configurationError","OPENAI_API_KEY n'est pas configurée pour la simulation IA locale.");return;
  }
  if(type==="ai"&&!$("aiPrivacyConsent").checked){
    error("configurationError","Acceptez d'abord l'envoi des réponses au fournisseur IA pour cette simulation.");return;
  }
  state.selection={
    family:$("simFamily").value,
    simulationMode:type,
    domain:$("simFamily").value==="technical"?$("simDomain").value:null,
    difficulty:$("simDifficulty").value?Number($("simDifficulty").value):null,
    locale:state.profile.preferred_locale,
    count:Number($("simCount").value),
    prepGoals:simGoals,
    jobDescription:$("simJobDescription").value.trim(),
  };
  if(state.mode==="live"&&type==="guided"){
    error("configurationError",
      "Les 120 questions de Supabase sont toujours en brouillon. Lancez une simulation locale IA de test, ou utilisez le parcours Démo.");return;
  }
  $("launchInterview").disabled=true;
  try{
    state.aiSession=null;state.aiFeedback=null;
    if(type==="ai"){
      const result=await jsonResponse("/api/ai/session/start",{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({
          family:state.selection.family,domain:state.selection.domain,
          difficulty:state.selection.difficulty,locale:state.selection.locale,
          count:state.selection.count,goals:simGoals,
          job_description:state.selection.jobDescription,
        }),
      });
      state.aiSession=result.session_id;
      state.aiCurrentQuestion=result.question;
      state.aiTotal=result.total;
      state.aiPhase=result.phase;
      state.questions=[];state.index=0;state.answers=[];
    }else{
      const {items}=await jsonResponse("/api/questions?family="+encodeURIComponent(state.selection.family)+"&locale="+state.selection.locale);
      let filtered=items.filter(q=>
        (!state.selection.difficulty||q.difficulty===state.selection.difficulty) &&
        (!state.selection.domain||q.category===state.selection.domain));
      if(filtered.length===0)throw Error("Aucune question démo ne correspond à ces critères.");
      state.questions=filtered.slice(0,state.selection.count);
      state.answers=[];state.index=0;
    }
    showCurrentQuestion();show("interview");
  }catch(e){error("configurationError",e);}
  finally{$("launchInterview").disabled=false;}
}
function showCurrentQuestion(){
  const ai=Boolean(state.aiSession);
  const q=ai?state.aiCurrentQuestion:state.questions[state.index];
  const count=ai?state.aiTotal:state.questions.length;
  text("interviewProgress","Question "+(state.index+1)+" / "+count+
    (ai&&state.aiPhase==="followup"?" · Relance IA":""));
  $("interviewProgressBar").style.width=(100*state.index/count)+"%";
  text("interviewCode",q.code);
  text("interviewLevel","L"+q.difficulty+" · "+q.category);
  text("interviewPrompt",q.prompt);
  if(ai){
    text("interviewStatus",state.aiPhase==="followup"
      ?"RELANCE GÉNÉRÉE PAR L'IA · TEST LOCAL"
      :"ENTRETIEN AVEC IA · QUESTIONS EN BROUILLON");
    text("interviewFollowup",state.aiPhase==="followup"
      ?"Cette question de relance a été générée par l'IA à partir de votre réponse précédente."
      :"Répondez naturellement. L'IA préparera une relance en tenant compte de votre réponse et des objectifs choisis.");
  }else{
    text("interviewStatus","DÉMONSTRATION GUIDÉE · SANS IA");
    text("interviewFollowup",q.followup?"Relance prédéfinie (non IA) : "+q.followup:"Aucune relance prédéfinie");
  }
  $("interviewAnswer").value="";
  text("interviewError","");
  text("submitAnswer",ai
    ?(state.aiPhase==="primary"?"Répondre et obtenir une relance IA →"
      :state.index===count-1?"Terminer et recevoir mon bilan IA →":"Passer à la question suivante →")
    :state.index===count-1?"Terminer l'entretien":"Valider ma réponse et continuer →");
}
async function completeStep(){
  text("interviewError","");
  if(state.aiSession){
    if(!$("interviewAnswer").value.trim()){
      error("interviewError","Une réponse est nécessaire pour permettre à l'IA de vous relancer.");return;
    }
    $("submitAnswer").disabled=true;
    const previousText=$("submitAnswer").textContent;
    text("submitAnswer","L'IA prépare sa réponse…");
    try{
      const result=await jsonResponse("/api/ai/session/answer",{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({
          session_id:state.aiSession,
          answer:$("interviewAnswer").value.trim(),
          visible_prompt:state.aiCurrentQuestion.prompt,
        }),
      });
      if(result.completed){
        state.answers=result.transcript.map(item=>({
          code:item.code,prompt:item.question,answer:item.answer,
        }));
        state.aiFeedback=result.feedback||null;
        state.aiSession=null;
        renderRecap();show("recap");
      }else{
        state.aiCurrentQuestion=result.question;
        state.aiPhase=result.phase;
        state.index=result.index-1;
        showCurrentQuestion();
      }
    }catch(e){error("interviewError",e);}
    finally{$("submitAnswer").disabled=false;
      if(state.page==="interview"&&$("submitAnswer").textContent==="L'IA prépare sa réponse…")
        text("submitAnswer",previousText);}
    return;
  }
  state.answers.push({
    code:state.questions[state.index].code,
    prompt:state.questions[state.index].prompt,
    answer:$("interviewAnswer").value.trim(),
  });
  state.index+=1;
  if(state.index>=state.questions.length){renderRecap();show("recap");}
  else{showCurrentQuestion();}
}
function renderRecap(){
  text("recapCount",state.answers.length+(state.selection?.simulationMode==="ai"?" réponse(s)":" question(s)"));
  $("aiRecapFeedback").classList.toggle("hidden",!state.aiFeedback);
  text("aiRecapFeedback",state.aiFeedback?"Bilan qualitatif de l'IA (sans notation) :\n"+state.aiFeedback:"");
  text("recapPersistentGoals",names(state.profile.preparation_goals));
  text("recapSimulationGoals",names(state.selection.prepGoals));
  $("recapAnswers").replaceChildren();
  for(const answer of state.answers){
    const block=document.createElement("div");block.className="item";
    const code=document.createElement("span");code.className="tag";code.textContent=answer.code;
    const title=document.createElement("h3");title.textContent=answer.prompt;
    const paragraph=document.createElement("p");paragraph.textContent=answer.answer||"Aucune réponse saisie";
    block.append(code,title,paragraph);$("recapAnswers").append(block);
  }
}
async function signOut(){
  if(state.mode==="live"&&state.accessToken){
    try{await jsonResponse(supabasePath("/auth/v1/logout"),{
      method:"POST",headers:authHeaders(state.accessToken),body:"{}",
    });}catch { /* Client state is still cleared; backend tokens expire server-side. */ }
  }
  state.user=null;state.accessToken=null;state.profile=null;state.selectedGoals=[];
  state.questions=[];state.answers=[];state.index=0;
  state.aiSession=null;state.aiFeedback=null;
  text("modeIndicator","MODE DÉMO · LOCAL");
  show("welcome");
}
async function init(){
  try{
    const cfg=await jsonResponse("/api/e2e/config");
    if(cfg.live_available){
      state.liveConfig={supabase_url:cfg.supabase_url,publishable_key:cfg.publishable_key};
      $("chooseLive").disabled=false;
      text("liveAvailability","Disponible : compte Supabase réel et préférences persistantes.");
    }else{
      text("liveAvailability","Mode réel disponible après configuration des variables SUPABASE_URL et SUPABASE_PUBLISHABLE_KEY sur votre Mac.");
    }
  }catch(e){text("liveAvailability","Impossible de vérifier la connexion Supabase locale : "+e.message);}
  try{
    const status=await jsonResponse("/api/ai/status");
    state.aiReady=Boolean(status.available);
    state.aiProvider=status.provider||null;
    const aiOption=$("simMode").querySelector('option[value="ai"]');
    aiOption.disabled=!state.aiReady;
    aiOption.textContent=state.aiReady
      ? "Entretien avec relances IA · "+(state.aiProvider==="groq"?"Groq":"OpenAI")
      : "Entretien avec relances IA (clé API nécessaire)";
    if(state.aiReady){
      text("aiModeHint","L'IA est disponible. Vos réponses de test seront envoyées au fournisseur IA seulement avec votre accord.");
    }
  }catch {state.aiReady=false;}
}
$("chooseDemo").onclick=()=>enterAuth("demo");
$("chooseLive").onclick=()=>{if(state.liveConfig)enterAuth("live");};
$("toggleAuth").onclick=()=>{state.authMode=state.authMode==="signup"?"login":"signup";renderAuth();};
$("authForm").addEventListener("submit",doAuth);
$("onboardingForm").addEventListener("submit",submitOnboarding);
$("professionalOptions").addEventListener("change",event=>{
  if(event.target.matches('input[type="radio"]'))
    for(const node of event.currentTarget.querySelectorAll(".choice"))
      node.classList.toggle("selected",node.querySelector("input").checked);
});
for(const id of ["preparationOptions","simulationGoals"]){
  $(id).addEventListener("change",event=>{
    if(event.target.matches('input[type="checkbox"]'))
      event.target.closest(".choice").classList.toggle("selected",event.target.checked);
  });
}
$("editProfile").onclick=()=>{renderOnboarding();show("onboarding");};
$("signOut").onclick=signOut;
$("goConfigure").onclick=()=>{renderConfiguration();show("configure");};
$("backDashboard").onclick=()=>{renderDashboard();show("dashboard");};
$("simFamily").addEventListener("change",()=>{
  rememberCurrentSimulationGoals();
  renderSimulationGoals();
});
$("simDomain").addEventListener("change",()=>{
  rememberCurrentSimulationGoals();
  renderSimulationGoals();
});
$("simMode").addEventListener("change",()=>{
  $("aiPrivacyConsent").checked=false;
  renderAIMode();
});
$("configurationForm").addEventListener("submit",startSimulation);
$("submitAnswer").onclick=completeStep;
$("stopInterview").onclick=()=>{renderDashboard();show("dashboard");};
$("retrySimulation").onclick=()=>{renderConfiguration();show("configure");};
$("returnDashboard").onclick=()=>{renderDashboard();show("dashboard");};
init();
