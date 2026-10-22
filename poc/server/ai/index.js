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
export function openaiCompatible({ baseUrl = "https://api.openai.com/v1", apiKey, model }) {
  if (!model) throw new Error("AI_MODEL requis pour le fournisseur openai");
  const url = baseUrl.replace(/\/+$/, "") + "/chat/completions";
  return { name: "openai-compatible", async complete({ system, user, maxTokens = 300, temperature = 0.4 }) {
    const j = await post(url, apiKey ? { authorization: `Bearer ${apiKey}` } : {}, { model, messages: msgs(system, user), max_tokens: maxTokens, temperature });
    return j?.choices?.[0]?.message?.content || "";
  } };
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
  if (p === "workers-ai" || (p === "auto" && bindings.AI)) return bindings.AI ? workersAI(bindings.AI, cfg.AI_MODEL || undefined) : null;
  if (p === "openai" || (p === "auto" && cfg.AI_BASE_URL && !/anthropic/.test(cfg.AI_BASE_URL))) return openaiCompatible({ baseUrl: cfg.AI_BASE_URL, apiKey: cfg.AI_API_KEY, model: cfg.AI_MODEL });
  if (p === "anthropic") return anthropic({ baseUrl: cfg.AI_BASE_URL, apiKey: cfg.AI_API_KEY, model: cfg.AI_MODEL });
  return null;
}
