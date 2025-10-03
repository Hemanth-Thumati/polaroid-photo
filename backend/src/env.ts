import { z } from "zod";

type Pricing = Record<"SMALL_2x3" | "MEDIUM_3x4" | "LARGE_4x6", number>;

const pricingSchema = z.object({
  PRICE_2x3: z.coerce.number().int().nonnegative().default(1500),
  PRICE_3x4: z.coerce.number().int().nonnegative().default(2000),
  PRICE_4x6: z.coerce.number().int().nonnegative().default(2500),
});

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  ADMIN_API_KEY: z.string().min(8),
  USE_S3: z.coerce.boolean().default(false),
  S3_ENDPOINT: z.string().optional().or(z.literal("")),
  S3_BUCKET: z.string().optional().or(z.literal("")),
  S3_REGION: z.string().optional().or(z.literal("")),
  S3_ACCESS_KEY_ID: z.string().optional().or(z.literal("")),
  S3_SECRET_ACCESS_KEY: z.string().optional().or(z.literal("")),
  S3_PUBLIC_BASE_URL: z.string().optional().or(z.literal("")),
  GMAIL_TO: z.string().email(),
  GMAIL_FROM: z.string(),
  GMAIL_CLIENT_ID: z.string().optional().or(z.literal("")),
  GMAIL_CLIENT_SECRET: z.string().optional().or(z.literal("")),
  GMAIL_REFRESH_TOKEN: z.string().optional().or(z.literal("")),
  GMAIL_USER: z.string().optional().or(z.literal("")),
  GMAIL_APP_PASSWORD: z.string().optional().or(z.literal("")),
  TWILIO_ACCOUNT_SID: z.string().optional().or(z.literal("")),
  TWILIO_AUTH_TOKEN: z.string().optional().or(z.literal("")),
  TWILIO_WHATSAPP_FROM: z.string().optional().or(z.literal("")),
  TWILIO_ADMIN_WHATSAPP_TO: z.string().optional().or(z.literal("")),
  WABA_TOKEN: z.string().optional().or(z.literal("")),
  WABA_PHONE_NUMBER_ID: z.string().optional().or(z.literal("")),
  ADMIN_WHATSAPP_TO: z.string().optional().or(z.literal("")),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().positive().default(400),
});

const pricingResult = pricingSchema.safeParse(process.env);
if (!pricingResult.success) {
  throw new Error(`Invalid pricing configuration: ${pricingResult.error.message}`);
}

const envResult = envSchema.safeParse(process.env);
if (!envResult.success) {
  throw new Error(`Invalid environment configuration: ${envResult.error.message}`);
}

const pricing: Pricing = {
  SMALL_2x3: pricingResult.data.PRICE_2x3,
  MEDIUM_3x4: pricingResult.data.PRICE_3x4,
  LARGE_4x6: pricingResult.data.PRICE_4x6,
};

export const env = {
  ...envResult.data,
  pricing,
};

export type Env = typeof env;
