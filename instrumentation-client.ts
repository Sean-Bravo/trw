// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://a8765a802b38ce9b8eb749f3a206e4a6@o4510737151623168.ingest.us.sentry.io/4510737158635520",

  // Route requests through Next.js to avoid ad blockers
  tunnel: "/monitoring",

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // H-10: do not record full sessions in production. Background-record
  // only sessions that hit an error.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.1,

  // H-10: do not ship default PII (IP, cookies, headers, request bodies)
  // to Sentry. The leaked Sentry token (C-4) plus default-PII would have
  // exposed every user email + IP. See SECURITY_AUDIT.md §H-10.
  sendDefaultPii: false,

  beforeSend(event) {
    // Belt-and-suspenders: drop a few common credential carriers in case
    // sendDefaultPii flips back to true accidentally.
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
      delete event.request.headers["x-api-key"];
    }
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
