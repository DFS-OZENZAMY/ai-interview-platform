/** Hôte Cloudflare Workers : D1 + Workers AI (ou autre fournisseur IA par variables). */
import { createApp } from "../core/app.js";
import { d1Store } from "../stores/d1.js";
import { createAI } from "../ai/index.js";
import { createQuestionSource } from "../questions/index.js";

let api;
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(req);
    // Sur Cloudflare, le catalogue S2-03 se branche par HTTP (QUESTION_SOURCE=catalog-http).
    api ||= createApp({
      DB: env.DB ? d1Store(env.DB) : null,
      AI: createAI(env, { AI: env.AI }),
      QUESTIONS: await createQuestionSource(env),
      COACH_INVITE_CODE: env.COACH_INVITE_CODE,
      COOKIE_SECURE: env.COOKIE_SECURE !== "false",
      RUNTIME: "cloudflare-workers",
    });
    return api(req);
  },
};
