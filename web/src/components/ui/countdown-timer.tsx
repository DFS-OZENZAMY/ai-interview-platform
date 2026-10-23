"use client";
import { Timer } from "@ark-ui/react/timer";
import { Clock3 } from "lucide-react";

export function CountdownTimer({seconds=5,onComplete}:{seconds?:number;onComplete:()=>void}){
 return <div className="flex flex-col items-center gap-3" role="timer" aria-label="Compte à rebours avant l'entretien">
   <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-[#B5C6EF]"><Clock3 size={16}/> Démarrage dans</div>
   <Timer.Root key={seconds} countdown autoStart startMs={seconds*1000} onComplete={onComplete} className="flex flex-col items-center">
     <Timer.Area className="flex items-center justify-center font-mono text-[clamp(5rem,15vw,8rem)] font-bold leading-none tracking-[-.07em] text-white">
       <Timer.Item type="seconds" className="min-w-[2ch] text-center"/>
     </Timer.Area>
   </Timer.Root>
   <p className="text-sm text-[#B7C7EA]">Installez-vous confortablement, l’intervieweur arrive.</p>
 </div>;
}
