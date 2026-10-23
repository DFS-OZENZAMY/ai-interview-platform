# Voix de Lina — Kyutai Pocket TTS (MIT), exécutée dans Cloudflare Containers (ou tout hôte Docker).
# Le modèle français et la voix par défaut sont téléchargés AU BUILD : le conteneur démarre ensuite sans Internet.
FROM python:3.12-slim
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1 HF_HOME=/opt/hf PYTHONUNBUFFERED=1
# PyTorch CPU uniquement (évite plusieurs Go de bibliothèques CUDA inutiles ici)
RUN pip install --index-url https://download.pytorch.org/whl/cpu torch \
 && pip install pocket-tts==4.0.1
# Préchargement : modèle français + voix par défaut (« estelle »), via une vraie génération de test
RUN pocket-tts generate --language french --text "Bonjour, je suis Lina." --output-path /tmp/warmup.wav \
 && test -s /tmp/warmup.wav && rm /tmp/warmup.wav
ENV HF_HUB_OFFLINE=1
EXPOSE 8000
CMD ["pocket-tts", "serve", "--language", "french", "--host", "0.0.0.0", "--port", "8000"]
