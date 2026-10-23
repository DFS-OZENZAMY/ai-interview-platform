/**
 * Fournisseurs d'IA interchangeables. Tous exposent { name, complete({system, user, maxTokens, temperature}) -> string }.
 * - workers-ai : binding Cloudflare (aucune clé) ;
 * - openai : toute API compatible « chat/completions » (OpenAI, Azure OpenAI, Mistral, Groq, OpenRouter, Ollama, vLLM, LM Studio…) ;
 * - anthropic : API Messages d'Anthropic ;
 * - none : pas d'IA, l'application utilise son moteur local.
 * Les clés restent côté serveur. Aucun contenu n'est journalisé.
 */
const TIMEOUT_MS = 20000;
async function post(url, headers, body) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal: ctl.signal });
    if (!r.ok) throw new Error(`ai_http_${r.status}`);
    return await r.json();
  } finally { clearTimeout(t); }
}
const msgs = (system, user) => [{ role: "system", content: system }, { role: "user", content: user }];

export function workersAI(binding, model = "@cf/meta/llama-3.1-8b-instruct") {
  return { name: "workers-ai", async complete({ system, user, maxTokens = 300, temperature = 0.4 }) {
    const r = await binding.run(model, { messages: msgs(system, user), max_tokens: maxTokens, temperature });
    return r && r.response ? r.response : "";
  } };
}
export function openaiCompatible({ baseUrl = "https://api.openai.com/v1", apiKey, model, name = "openai-compatible" }) {
  if (!model) throw new Error("AI_MODEL requis pour le fournisseur openai");
  const url = baseUrl.replace(/\/+$/, "") + "/chat/completions";
  const gptOss = /^openai\/gpt-oss-/.test(model);
  return { name, model, async complete({ system, user, maxTokens = 300, temperature = 0.4 }) {
    // GPT-OSS (Groq) : le raisonnement consomme des jetons même masqué → marge et effort « low » (réglages d'Achraf).
    const body = gptOss
      ? { model, messages: msgs(system, user), max_completion_tokens: Math.max(512, maxTokens + 256), temperature: 0.6, reasoning_effort: "low", include_reasoning: false }
      : { model, messages: msgs(system, user), max_tokens: maxTokens, temperature };
    const headers = { "user-agent": "AIInterviewPlatform/0.1", ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) };
    const j = await post(url, headers, body);
    return j?.choices?.[0]?.message?.content || "";
  } };
}
/** Groq : API compatible OpenAI, modèle openai/gpt-oss-120b par défaut (Llama 3.3 70B retiré en août 2026). */
export function groq({ apiKey, model = "openai/gpt-oss-120b", baseUrl = "https://api.groq.com/openai/v1" }) {
  if (!apiKey) throw new Error("GROQ_API_KEY requis");
  if (/^sk-/.test(apiKey)) throw new Error("GROQ_API_KEY ressemble à une clé OpenAI (sk-…) : une clé Groq commence par gsk_");
  return openaiCompatible({ baseUrl, apiKey, model, name: "groq" });
}
export function anthropic({ baseUrl = "https://api.anthropic.com", apiKey, model }) {
  if (!apiKey || !model) throw new Error("AI_API_KEY et AI_MODEL requis pour le fournisseur anthropic");
  const url = baseUrl.replace(/\/+$/, "") + "/v1/messages";
  return { name: "anthropic", async complete({ system, user, maxTokens = 300, temperature = 0.4 }) {
    const j = await post(url, { "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, { model, system, max_tokens: maxTokens, temperature, messages: [{ role: "user", content: user }] });
    return (j?.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  } };
}

/** Choisit le fournisseur selon la configuration. Retourne null si aucune IA. */
export function createAI(cfg = {}, bindings = {}) {
  const p = (cfg.AI_PROVIDER || "auto").toLowerCase();
  if (p === "none") return null;
  if (p === "groq" || (p === "auto" && cfg.GROQ_API_KEY)) return groq({ apiKey: cfg.GROQ_API_KEY || cfg.AI_API_KEY, model: cfg.GROQ_MODEL || undefined, baseUrl: cfg.GROQ_BASE_URL || undefined });
  if (p === "workers-ai" || (p === "auto" && bindings.AI)) return bindings.AI ? workersAI(bindings.AI, cfg.AI_MODEL || undefined) : null;
  if (p === "openai" || (p === "auto" && cfg.AI_BASE_URL && !/anthropic/.test(cfg.AI_BASE_URL))) return openaiCompatible({ baseUrl: cfg.AI_BASE_URL, apiKey: cfg.AI_API_KEY, model: cfg.AI_MODEL });
  if (p === "anthropic") return anthropic({ baseUrl: cfg.AI_BASE_URL, apiKey: cfg.AI_API_KEY, model: cfg.AI_MODEL });
  return null;
}
