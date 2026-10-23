import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";
// Déploiement sur Cloudflare Workers (adaptateur officiel OpenNext).
// Les pages sont pré-générées au build : elles sont servies depuis les fichiers statiques (cache en lecture seule).
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
