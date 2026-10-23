/** Test du relais STT sans navigateur : se connecte comme un navigateur au serveur du POC et envoie de l'audio synthétique.
 * Usage : BASE=http://127.0.0.1:8080 node stt_bridge_test.mjs   (serveur lancé avec STT_PROVIDER=kyutai) */
import WebSocket from "ws";
const BASE = process.env.BASE, WS = BASE.replace(/^http/, "ws") + "/api/stt/stream";
const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const H = { "content-type": "application/json", origin: BASE };
async function login(email) {
  const r = await fetch(BASE + "/api/auth/register", { method: "POST", headers: H, body: JSON.stringify({ role: "candidate", name: "Stt Test", email, password: "motdepasse1", consent: true }) });
  return "sid=" + r.headers.get("set-cookie").split("sid=")[1].split(";")[0];
}
const open = (headers) => new Promise((res) => { const ws = new WebSocket(WS, { headers }); ws.on("open", () => res({ ws, ok: true })); ws.on("unexpected-response", (_q, r) => res({ ok: false, status: r.statusCode })); ws.on("error", () => res({ ok: false })); });
const health = await (await fetch(BASE + "/api/health")).json();
ok(health.stt === "kyutai", "santé : STT = kyutai");
ok((await open({ origin: BASE })).status === 401, "sans connexion : refusé (401)");
const cookie = await login(`stt${Date.now()}@t.io`);
ok((await open({ cookie, origin: "https://pirate.example" })).status === 403, "autre origine : refusée (403)");
const { ws } = await open({ cookie, origin: BASE });
const got = []; ws.on("message", (d) => got.push(JSON.parse(d.toString())));
await new Promise((r) => setTimeout(r, 300));
ok(got.some((m) => m.type === "ready"), "Kyutai prêt (Ready relayé)");
// 2,4 s de « parole » (sinusoïde 220 Hz) puis 1,2 s de silence, par trames de 80 ms.
for (let f = 0; f < 45; f++) {
  const pcm = new Float32Array(1920); const voiced = f < 30;
  for (let i = 0; i < 1920; i++) pcm[i] = voiced ? 0.3 * Math.sin((2 * Math.PI * 220 * (f * 1920 + i)) / 24000) : 0;
  ws.send(Buffer.from(pcm.buffer)); await new Promise((r) => setTimeout(r, 5));
}
ws.send(Buffer.from(new Uint8Array([1, 2, 3])));            // trame malformée : doit être ignorée
await new Promise((r) => setTimeout(r, 500));
ws.send(JSON.stringify({ type: "stop" }));
await new Promise((r) => ws.on("close", r));
const words = got.filter((m) => m.type === "word").map((m) => m.text);
ok(words.length >= 5, `mots transcrits relayés : « ${words.join(" ")} »`);
ok(got.some((m) => m.type === "vad" && m.endOfSpeech), "fin de parole détectée (VAD sémantique)");
ok(got.at(-1).type === "done", "arrêt propre : marqueur reçu puis « done »");
ok(!got.some((m) => "apiKey" in m || JSON.stringify(m).includes("secret-test-token")), "la clé Kyutai n'apparaît jamais côté navigateur");
