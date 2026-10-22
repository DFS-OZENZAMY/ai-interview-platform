/** Hôte Cloudflare Workers : D1 + Workers AI (ou autre fournisseur IA par variables). */
import { createApp } from "../core/app.js";
import { d1Store } from "../stores/d1.js";
import { createAI } from "../ai/index.js";

let api;
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(req);
    api ||= createApp({
      DB: env.DB ? d1Store(env.DB) : null,
      AI: createAI(env, { AI: env.AI }),
      COACH_INVITE_CODE: env.COACH_INVITE_CODE,
      COOKIE_SECURE: env.COOKIE_SECURE !== "false",
      RUNTIME: "cloudflare-workers",
    });
    return api(req);
  },
};
