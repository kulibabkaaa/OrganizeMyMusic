import pino from "pino";

export const logger = pino({
  name: "organize-your-music",
  level: process.env.LOG_LEVEL ?? "info",
  redact: ["req.headers.authorization", "appleUserToken", "stripeWebhookSecret"]
});

