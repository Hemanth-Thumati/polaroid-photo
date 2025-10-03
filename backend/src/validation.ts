import { PrintSize } from "@prisma/client";
import { z } from "zod";

export const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
]);

export const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".heic", ".heif"]);

export const orderMetadataSchema = z.object({
  customerName: z.string().min(1, "Name is required"),
  phone: z
    .string()
    .min(1, "Phone is required")
    .regex(/^\+[1-9]\d{1,14}$/, "Phone must be in E.164 format"),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().min(1, "Shipping address is required"),
  size: z.nativeEnum(PrintSize),
  quantityPerPhoto: z.coerce.number().int().min(1).max(20),
  notes: z.string().max(2000).optional().or(z.literal("")),
  agreeToTerms: z.coerce.boolean().refine((v) => v, "You must agree to the terms"),
});

export type OrderMetadataInput = z.infer<typeof orderMetadataSchema>;
