import pino from "pino";

export const logger = pino({
  name: "organize-your-music",
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "req.headers.authorization",
      "appleUserToken",
      "musicUserToken",
      "encryptedUserToken",
      "developerToken",
      "stripeWebhookSecret",
      "*.appleUserToken",
      "*.musicUserToken",
      "*.encryptedUserToken",
      "*.developerToken",
      "*.token"
    ],
    censor: "[Redacted]"
  }
});
