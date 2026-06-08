import pino from "pino";

const sensitiveKeyPattern = /authorization|cookie|password|private.?key|secret|token/i;
const redactedValue = "[Redacted]";

export const logger = pino({
  name: "organize-your-music",
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "appleUserToken",
      "musicUserToken",
      "userToken",
      "developerToken",
      "stripeWebhookSecret"
    ],
    censor: redactedValue
  },
  formatters: {
    log(object) {
      return sanitizeLogObject(object);
    }
  }
});

export function sanitizeLogObject<T>(value: T): T {
  return sanitizeValue(value) as T;
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  if (value instanceof Error) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      sensitiveKeyPattern.test(key) ? redactedValue : sanitizeValue(nestedValue)
    ])
  );
}
