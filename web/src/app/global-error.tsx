"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui", padding: "3rem", background: "#f8faff", color: "#18233d" }}>
        <main>
          <h1>Un problème est survenu</h1>
          <p>Votre session peut être réessayée sans exposer vos réponses.</p>
          <button onClick={reset}>Réessayer</button>
        </main>
      </body>
    </html>
  );
}
