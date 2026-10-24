import { NextRequest, NextResponse } from "next/server";
import { sameOrigin, upstream } from "@/lib/platform-upstream";

/* Relais des comptes de la plateforme quand l'application ne tourne PAS dans le Worker unique (Mac d'Achraf, Vercel, Node…) :
   le navigateur parle à l'application, qui relaie /api/auth/* et /api/web/* vers la plateforme (LAB_UPSTREAM_URL) en
   transmettant le cookie de session. Sur Cloudflare, worker.ts route déjà ces chemins directement vers la plateforme. */
export async function relay(request: NextRequest, path: string) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "bad_origin", message: "Origine non autorisée." }, { status: 403 });
  const headers = new Headers({ "content-type": request.headers.get("content-type") ?? "application/json" });
  const cookie = request.headers.get("cookie"); if (cookie) headers.set("cookie", cookie);
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  try {
    const res = await upstream(path + request.nextUrl.search, { method: request.method, headers, body: hasBody ? await request.text() : undefined, cache: "no-store", signal: AbortSignal.timeout(15000) });
    const out = new Headers({ "content-type": res.headers.get("content-type") ?? "application/json", "cache-control": "no-store" });
    res.headers.getSetCookie().forEach(c => out.append("set-cookie", c));
    return new NextResponse(await res.arrayBuffer(), { status: res.status, headers: out });
  } catch {
    return NextResponse.json({ error: "platform_unavailable", message: "Le service de comptes est momentanément indisponible." }, { status: 503 });
  }
}
