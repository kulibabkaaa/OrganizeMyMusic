import pino from "pino";

const sensitiveKeyPattern = /authorization|cookie|password|private.?key|secret|token/i;
const sensitiveValuePattern =
  /bearer\s+[a-z0-9._~+/=-]+|raw-[\w-]*token[\w-]*|music[-_ ]?user[-_ ]?token|developer[-_ ]?token|sk_(?:live|test|proj)_[\w-]+|sk-(?:live|test|proj)-[\w-]+|-----BEGIN [A-Z ]*PRIVATE KEY-----/i;
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
    return typeof value === "string" && sensitiveValuePattern.test(value) ? redactedValue : value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeValue(value.message),
      stack: value.stack ? sanitizeValue(value.stack) : undefined
    };
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      sensitiveKeyPattern.test(key) ? redactedValue : sanitizeValue(nestedValue)
    ])
  );
}
