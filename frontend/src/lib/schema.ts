import { z } from "zod";
import { PRINT_SIZES } from "./constants";

export const orderFormSchema = z.object({
  customerName: z.string().min(1, "Name is required"),
  phone: z
    .string()
    .min(1, "Phone is required")
    .regex(/^\+[1-9]\d{1,14}$/, "Use international format like +911234567890"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  address: z.string().min(1, "Address is required"),
  size: z.enum(PRINT_SIZES.map((s) => s.value) as [string, ...string[]]),
  quantityPerPhoto: z.coerce.number().int().min(1).max(20),
  notes: z.string().max(2000).optional().or(z.literal("")),
  agreeToTerms: z.literal(true, {
    errorMap: () => ({ message: "You must agree before submitting" }),
  }),
});

export type OrderFormValues = z.infer<typeof orderFormSchema>;
