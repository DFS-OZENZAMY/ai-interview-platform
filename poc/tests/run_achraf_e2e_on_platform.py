"""Exécute les tests navigateur d'Achraf (tests/e2e) SANS LES MODIFIER contre le serveur de la plateforme
(poc/server/hosts/node.js) au lieu de son serveur Python local : seule la fonction start_server est remplacée.
Usage (depuis la racine du dépôt) : python3 poc/tests/run_achraf_e2e_on_platform.py"""
import os, sys, subprocess, tempfile, time, unittest, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tests" / "e2e"))
import test_new_user_browser as nub, test_ai_family_browser as aif

def start_platform(live=False):
    env = dict(os.environ, PORT=str(nub.PORT), HOST="127.0.0.1", SQLITE_PATH=tempfile.mkdtemp() + "/app.db", QUESTION_SOURCE="corpus-preview", AI_PROVIDER="none")
    for k in ("GROQ_API_KEY", "OPENAI_API_KEY", "ELEVENLABS_API_KEY", "TTS_PROVIDER", "STT_PROVIDER"): env.pop(k, None)
    if live: env.update(SUPABASE_URL=nub.FAKE_PROJECT, SUPABASE_PUBLISHABLE_KEY="sb_publishable_e2e_mock_only")
    else: env.pop("SUPABASE_URL", None); env.pop("SUPABASE_PUBLISHABLE_KEY", None)
    proc = subprocess.Popen(["node", "--disable-warning=ExperimentalWarning", str(ROOT / "poc/server/hosts/node.js")], cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    for _ in range(60):
        if proc.poll() is not None: raise RuntimeError("Serveur de la plateforme arrêté : " + proc.stderr.read().decode())
        try:
            with urllib.request.urlopen(nub.ORIGIN + "/api/health", timeout=.5): return proc
        except Exception: time.sleep(.25)
    proc.terminate(); raise RuntimeError("Serveur de la plateforme non joignable")

nub.start_server = start_platform; aif.start_server = start_platform
suite = unittest.TestSuite([unittest.defaultTestLoader.loadTestsFromModule(nub), unittest.defaultTestLoader.loadTestsFromModule(aif)])
sys.exit(0 if unittest.TextTestRunner(verbosity=2).run(suite).wasSuccessful() else 1)
