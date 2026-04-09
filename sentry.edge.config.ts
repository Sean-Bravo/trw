// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://a8765a802b38ce9b8eb749f3a206e4a6@o4510737151623168.ingest.us.sentry.io/4510737158635520",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // H-10: do not ship default PII to Sentry. SECURITY_AUDIT.md §H-10.
  sendDefaultPii: false,

  beforeSend(event) {
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
