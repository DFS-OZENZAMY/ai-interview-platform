import { validateProfile, deriveSeniority, jobFamily } from "../server/core/profile-contract.js";
let pass=0, fail=0; const ok=(c,m)=>{c?pass++:fail++; console.log((c?"PASS ":"FAIL ")+m)};
const base={motivation:{goal:"first_job",reasons:["Progresser à l’oral"],axes:["structure"]},languages:{spoken:[{language:"Français",level:"C2"},{language:"Anglais",level:"B2"}],preferredInterface:"fr"},skills:{acquired:[{label:"SQL",source:"catalog"}],toDevelop:[{label:"Python",source:"ai"},{label:"sql",source:"free"}]}};
// étudiant
let st={...base,situation:{status:"student",targetJob:"Data analyst"},background:{yearsExperience:"0,5",education:{degree:"bac5",field:"Statistiques",internships:["Stage BI"],projects:[]}}};
let v=validateProfile(st); ok(v.ok,"student valid without current job"); ok(v.value.situation.currentJob===null,"no current job stored for student");
ok(v.value.background.yearsExperience===0.5,"decimal comma years parsed"); ok(v.value.seniority.level==="student","seniority student");
ok(!v.value.background.professional,"no professional block invented for student");
ok(v.value.skills.toDevelop.length===1&&v.value.skills.toDevelop[0].label==="Python","skill in both lists removed from toDevelop");
ok(v.value.languages.spoken.every(l=>l.selfDeclared),"languages flagged self-declared");
// étudiant: champs essentiels manquants
v=validateProfile({...st,background:{yearsExperience:"",education:{}}},2); ok(!v.ok&&v.errors["background.yearsExperience"]&&v.errors["background.education.degree"]&&v.errors["background.education.field"],"student step2 required fields");
v=validateProfile({...st,background:{yearsExperience:12,education:{degree:"bac5",field:"Statistiques"}}},2); ok(v.ok&&v.warnings["background.yearsExperience"],"incoherent years -> warning, not blocking");
// professionnel
let pro={...base,situation:{status:"employed",targetJob:"Chef de projet",currentJob:"Développeur"},background:{yearsExperience:6,professional:{yearsInRole:8,sectors:[]}}};
v=validateProfile(pro,1); ok(v.ok,"employed step1 ok with current job");
v=validateProfile({...pro,situation:{status:"employed",targetJob:"PM"}},1); ok(v.errors["situation.currentJob"],"employed requires current job");
v=validateProfile(pro,2); ok(v.errors["background.professional.yearsInRole"]&&v.errors["background.professional.sectors"],"years in role > total and sectors required");
v=validateProfile({...pro,background:{yearsExperience:6,professional:{yearsInRole:3,sectors:["Conseil"]}}}); ok(v.ok&&v.value.seniority.level==="senior","pro valid, senior at 6y");
ok(!v.value.background.education,"no education invented for pro");
// reconversion
let rc={...base,situation:{status:"reconversion",targetJob:"Développeur web",currentJob:"Comptable"},background:{yearsExperience:3}};
v=validateProfile(rc); ok(v.ok&&v.value.situation.currentJob==="Comptable"&&v.value.situation.targetJob==="Développeur web","reconversion keeps origin and target distinct");
ok(v.value.background.reconversion.transferable===null,"skipped optional stays null (no invented data)");
ok(v.value.seniority.level==="mid","seniority mid at 3y");
// étape 4/5
v=validateProfile({...rc,languages:{spoken:[{language:"Anglais"}],preferredInterface:null}},4); ok(v.errors["languages.spoken"]&&v.errors["languages.preferredInterface"],"language level + interface required");
v=validateProfile({...rc,skills:{acquired:[],toDevelop:[]}},5); ok(v.errors["skills.toDevelop"]&&!v.errors["skills.acquired"],"toDevelop required, acquired optional");
v=validateProfile({...rc,languages:{spoken:[{language:"Anglais",level:"Z9"}],preferredInterface:"fr"}},4); ok(!v.ok,"invalid CEFR rejected");
ok(deriveSeniority("graduate",1).level==="junior"&&deriveSeniority("employed",2).level==="mid","seniority thresholds");
ok(jobFamily("Data analyst")==="data"&&jobFamily("Chargé·e RH")==="rh"&&jobFamily("Boulanger")===null,"job family mapping");
v=validateProfile({situation:{status:"hacker",targetJob:"<script>"}},1); ok(!v.ok&&v.errors["situation.status"],"unknown status rejected");
console.log(`\n${pass} passed, ${fail} failed`);
