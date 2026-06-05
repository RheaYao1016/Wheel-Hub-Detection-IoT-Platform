import * as Sentry from "@sentry/nextjs";

/**
 * Sentry Edge Runtime配置
 * 用于Vercel Edge Functions / Middleware
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || "development",

  tracesSampleRate:
    process.env.NODE_ENV === "production"
      ? parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || "0.1")
      : 1.0,

  beforeSend(event) {
    if (process.env.NODE_ENV !== "production") {
      return null;
    }
    return event;
  },
});
