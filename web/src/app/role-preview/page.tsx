"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthClient } from "@/lib/supabase-auth";
import { getAppRole, type AppRole } from "@/lib/profile";
import { Sparkles } from "lucide-react";

export default function RolePreview() {
  const [role,setRole]=useState<AppRole | null>(null);
  const router=useRouter();
  useEffect(()=>{
    let mounted=true;
    async function check() {
      const client=getAuthClient();
      if(!client){router.replace("/login");return;}
      const {data:{user}}=await client.auth.getUser();
      if(!user){router.replace("/login");return;}
      const r=await getAppRole(client,user.id);
      if(r==="user"){router.replace("/dashboard");return;}
      if(mounted)setRole(r);
    }
    void check();
    return ()=>{mounted=false;};
  },[router]);
  async function leave() {
    await getAuthClient()?.auth.signOut();router.replace("/login");router.refresh();
  }
  return <main className="flex min-h-dvh items-center justify-center bg-[#0B1530] px-5 text-white">
    <section className="w-full max-w-lg rounded-3xl border border-white/15 bg-white/10 p-9 text-center backdrop-blur-xl">
      <Sparkles className="mx-auto text-[#BDD0FF]" size={34}/>
      <p className="mt-7 text-xs font-semibold uppercase tracking-widest text-[#AFC5FF]">{role === "admin" ? "Espace administrateur" : role === "coach" ? "Espace coach" : "Vérification du rôle"}</p>
      <h1 className="mt-3 text-3xl font-semibold">Notre prochain chantier.</h1>
      <p className="mt-4 leading-7 text-[#D6E1F6]">Cet accès est réservé à votre rôle. Nous finalisons d’abord la vue candidat avant de construire cet espace.</p>
      <button onClick={leave} className="mt-8 rounded-xl bg-white px-6 py-3 font-semibold text-[#15254B]">Se déconnecter</button>
    </section>
  </main>;
}
