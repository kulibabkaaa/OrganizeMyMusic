import { z } from "zod";

const emptyStringToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (typeof value === "string" && value.trim() === "") {
      return undefined;
    }

    return value;
  }, schema);

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: emptyStringToUndefined(z.string().url().default("http://localhost:3000")),
  NEXT_PUBLIC_SUPABASE_URL: emptyStringToUndefined(z.string().url().optional()),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: emptyStringToUndefined(z.string().optional()),
  SUPABASE_SERVICE_ROLE_KEY: emptyStringToUndefined(z.string().optional()),
  DATABASE_URL: emptyStringToUndefined(z.string().optional()),
  APPLE_TEAM_ID: emptyStringToUndefined(z.string().optional()),
  APPLE_KEY_ID: emptyStringToUndefined(z.string().optional()),
  APPLE_PRIVATE_KEY: emptyStringToUndefined(z.string().optional()),
  APPLE_MUSICKIT_KEY: emptyStringToUndefined(z.string().optional()),
  OPENAI_API_KEY: emptyStringToUndefined(z.string().optional()),
  STRIPE_SECRET_KEY: emptyStringToUndefined(z.string().optional()),
  STRIPE_WEBHOOK_SECRET: emptyStringToUndefined(z.string().optional()),
  STRIPE_PRICE_SORT: emptyStringToUndefined(z.string().optional()),
  SENTRY_DSN: emptyStringToUndefined(z.string().optional()),
  ENCRYPTION_KEY: emptyStringToUndefined(z.string().optional())
});

export const env = envSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  APPLE_TEAM_ID: process.env.APPLE_TEAM_ID,
  APPLE_KEY_ID: process.env.APPLE_KEY_ID,
  APPLE_PRIVATE_KEY: process.env.APPLE_PRIVATE_KEY,
  APPLE_MUSICKIT_KEY: process.env.APPLE_MUSICKIT_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_SORT: process.env.STRIPE_PRICE_SORT,
  SENTRY_DSN: process.env.SENTRY_DSN,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY
});

export function requireServerEnv<K extends keyof typeof env>(key: K) {
  const value = env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}
