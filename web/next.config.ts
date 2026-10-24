import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

// Cache Components n'est pas garanti sur le runtime Cloudflare Workers (setTimeout) : désactivé pour les builds
// Cloudflare (OPENNEXT_CLOUDFLARE=1). Le code n'utilise aucune API « use cache » : comportement identique.
const cloudflare = process.env.OPENNEXT_CLOUDFLARE === "1";
// Moteur d'authentification : les builds Cloudflare utilisent par défaut les comptes de la plateforme (D1) ;
// NEXT_PUBLIC_AUTH_PROVIDER=supabase|platform force un moteur (voir src/lib/auth-provider.ts).
const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_AUTH_DEFAULT: cloudflare ? "platform" : "" },
  cacheComponents: !cloudflare,
  partialPrefetching: !cloudflare,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
