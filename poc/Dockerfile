# Image unique du POC Répétition : interface + API. Fonctionne sur tout hébergeur de conteneurs.
FROM node:22-alpine
WORKDIR /app
COPY server/package.json server/
RUN cd server && npm install --omit=dev --no-audit --no-fund
COPY server/ server/
COPY public/ public/
RUN mkdir -p /data && chown node:node /data
ENV NODE_ENV=production PORT=8080 HOST=0.0.0.0 SQLITE_PATH=/data/app.db
USER node
EXPOSE 8080
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:8080/api/health >/dev/null || exit 1
CMD ["node", "--disable-warning=ExperimentalWarning", "server/hosts/node.js"]
