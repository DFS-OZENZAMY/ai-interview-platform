import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

// Cache Components n'est pas garanti sur le runtime Cloudflare Workers (setTimeout) : désactivé pour les builds
// Cloudflare (OPENNEXT_CLOUDFLARE=1). Le code n'utilise aucune API « use cache » : comportement identique.
const cloudflare = process.env.OPENNEXT_CLOUDFLARE === "1";
const nextConfig: NextConfig = {
  /* config options here */
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
