import * as Sentry from "@sentry/nextjs";

if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    includeLocalVariables: false,
    beforeSend(event) {
      if (event.request) delete event.request.data;
      if (event.user) delete event.user;
      return event;
    },
  });
}
