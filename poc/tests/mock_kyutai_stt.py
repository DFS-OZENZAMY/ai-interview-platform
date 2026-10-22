"""Faux moshi-server (Kyutai STT) qui respecte le protocole de /api/asr-streaming.
- Authentification : en-tête `kyutai-api-key` ou paramètre `?auth_id=` (liste authorized_ids).
- Entrée : messages msgpack {"type":"Audio","pcm":[float32 × 1920]} à 24 kHz, {"type":"Marker","id":n}.
- Sortie : Ready, Word(text,start_time), EndWord, Step(prs=[4 têtes VAD]), Marker (renvoyé après le délai du modèle).
Écrit des statistiques dans STATS_FILE pour les tests. Usage : python3 mock_kyutai_stt.py 8765"""
import asyncio, json, os, sys, math
import msgpack, websockets
TOKENS = {"secret-test-token"}
SENTENCE = "Lors de mon dernier stage j'ai automatisé un reporting ce qui a permis de gagner six heures par semaine".split()
STATS = os.environ.get("STATS_FILE", "/tmp/kyutai_stats.json")
stats = {"connections": 0, "rejected": 0, "frames": 0, "bad_frames": 0, "markers": 0, "max_abs": 0.0, "voiced_frames": 0}
def save(): open(STATS, "w").write(json.dumps(stats))
async def handler(ws):
    req = ws.request
    if req.path.split("?")[0] != "/api/asr-streaming": await ws.close(1008, "path"); return
    token = req.headers.get("kyutai-api-key") or (req.path.split("auth_id=")[1] if "auth_id=" in req.path else None)
    if token not in TOKENS: stats["rejected"] += 1; save(); await ws.close(1008, "unauthorized"); return
    stats["connections"] += 1; save()
    await ws.send(msgpack.packb({"type": "Ready"}))
    i, step, pending_marker, word_idx, silent_run = 0, 0, None, 0, 0
    async for raw in ws:
        m = msgpack.unpackb(raw, raw=False)
        if m.get("type") == "Marker": stats["markers"] += 1; pending_marker = (m["id"], 7); save(); continue
        if m.get("type") != "Audio": continue
        pcm = m.get("pcm", [])
        ok = isinstance(pcm, list) and len(pcm) == 1920 and all(isinstance(x, float) and -1.0 <= x <= 1.0 for x in pcm)
        stats["frames"] += 1; stats["bad_frames"] += 0 if ok else 1
        energy = math.sqrt(sum(x * x for x in pcm) / max(1, len(pcm))) if ok else 0
        stats["max_abs"] = max(stats["max_abs"], max((abs(x) for x in pcm), default=0))
        step += 1
        if energy > 0.003:
            stats["voiced_frames"] += 1; silent_run = 0
            if step % 4 == 0 and word_idx < len(SENTENCE):        # un mot toutes les ~320 ms de parole
                await ws.send(msgpack.packb({"type": "Word", "text": SENTENCE[word_idx], "start_time": round(step * 0.08 - 0.5, 2)}, use_single_float=True))
                word_idx += 1
        else:
            silent_run += 1
        pr = min(1.0, silent_run / 12)
        await ws.send(msgpack.packb({"type": "Step", "step_idx": step, "prs": [pr, pr * 0.9, pr * 0.8, pr * 0.7], "buffered_pcm": 0}, use_single_float=True))
        if pending_marker:
            mid, left = pending_marker
            if left <= 1: await ws.send(msgpack.packb({"type": "Marker", "id": mid})); pending_marker = None
            else: pending_marker = (mid, left - 1)
        if step % 25 == 0: save()
    save()
async def main():
    async with websockets.serve(handler, "127.0.0.1", int(sys.argv[1]), max_size=2**22): await asyncio.Future()
asyncio.run(main())
