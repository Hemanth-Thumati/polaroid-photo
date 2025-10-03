import twilio from "twilio";
import { Order, OrderFile } from "@prisma/client";
import { env } from "../env";
import { formatCurrency } from "../utils/pricing";
import type { ZipStrategy } from "./email";

export function buildWhatsAppMessage({
  order,
  zipStrategy,
  zipUrl,
}: {
  order: Order & { files: OrderFile[] };
  zipStrategy: ZipStrategy;
  zipUrl?: string | null;
}) {
  const lines = [
    `New Polaroid Order: ${order.id}`,
    `Name: ${order.customerName}`,
    `Phone: ${order.phone}`,
    `Email: ${order.email ?? "-"}`,
    `Size: ${order.size} | Qty/photo: ${order.quantityPerPhoto}`,
    `Files: ${order.fileCount}`,
    `Total: ${formatCurrency(order.total)}`,
    `ZIP: ${zipStrategy === "attachment" ? "attached" : "link"}`,
  ];

  if (zipStrategy === "link" && zipUrl) {
    lines.push(`Link: ${zipUrl}`);
  }

  return lines.join("\n");
}

async function sendViaTwilio(message: string) {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_WHATSAPP_FROM || !env.TWILIO_ADMIN_WHATSAPP_TO) {
    throw new Error("Twilio credentials missing");
  }
  const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  await client.messages.create({
    from: env.TWILIO_WHATSAPP_FROM,
    to: env.TWILIO_ADMIN_WHATSAPP_TO,
    body: message,
  });
}

async function sendViaMeta(message: string) {
  if (!env.WABA_TOKEN || !env.WABA_PHONE_NUMBER_ID || !env.ADMIN_WHATSAPP_TO) {
    throw new Error("WhatsApp Business API credentials missing");
  }

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${env.WABA_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WABA_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: env.ADMIN_WHATSAPP_TO,
        type: "text",
        text: { body: message },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Meta WhatsApp API failed: ${response.status} ${text}`);
  }
}

export async function sendWhatsAppNotification({
  order,
  zipStrategy,
  zipUrl,
}: {
  order: Order & { files: OrderFile[] };
  zipStrategy: ZipStrategy;
  zipUrl?: string | null;
}) {
  const message = buildWhatsAppMessage({ order, zipStrategy, zipUrl });

  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM && env.TWILIO_ADMIN_WHATSAPP_TO) {
    await sendViaTwilio(message);
    return { provider: "twilio" as const };
  }

  if (env.WABA_TOKEN && env.WABA_PHONE_NUMBER_ID && env.ADMIN_WHATSAPP_TO) {
    await sendViaMeta(message);
    return { provider: "meta" as const };
  }

  throw new Error("No WhatsApp provider configured");
}
