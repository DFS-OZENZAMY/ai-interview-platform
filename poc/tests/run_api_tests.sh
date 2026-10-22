#!/usr/bin/env sh
# Rejoue les tests d'API contre un serveur démarré (n'importe quel hébergeur).
# Usage : BASE=http://127.0.0.1:8080 sh tests/run_api_tests.sh   (serveur lancé avec COACH_INVITE_CODE=test-invite-123, base vide)
set -e
cd "$(dirname "$0")"
node contract_test.mjs | tail -1
python3 api_test.py | tee /tmp/api.txt | grep -c PASS | xargs -I{} echo "API : {}/34"
python3 onboarding_api_test.py | tee /tmp/ob.txt | grep -c PASS | xargs -I{} echo "Onboarding : {}/16"
! grep FAIL /tmp/api.txt /tmp/ob.txt
