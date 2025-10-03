import nodemailer from "nodemailer";
import { Order, OrderFile, PrintSize } from "@prisma/client";
import { env } from "../env";
import { formatCurrency } from "../utils/pricing";

type ZipStrategy = "attachment" | "link";

interface SendEmailOptions {
  order: Order & { files: OrderFile[] };
  zipStrategy: ZipStrategy;
  zipPath?: string | null;
  zipUrl?: string | null;
}

let transporter: nodemailer.Transporter | null = null;

function getAuthUser() {
  const match = env.GMAIL_FROM.match(/<([^>]+)>/);
  return env.GMAIL_USER || match?.[1] || env.GMAIL_FROM;
}

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const authUser = getAuthUser();

  if (env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET && env.GMAIL_REFRESH_TOKEN) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: authUser,
        clientId: env.GMAIL_CLIENT_ID,
        clientSecret: env.GMAIL_CLIENT_SECRET,
        refreshToken: env.GMAIL_REFRESH_TOKEN,
      },
    });
  } else if (env.GMAIL_APP_PASSWORD || env.GMAIL_USER) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: authUser,
        pass: env.GMAIL_APP_PASSWORD,
      },
    });
  } else {
    throw new Error("Email configuration is incomplete");
  }

  return transporter;
}

function sizeLabel(size: PrintSize) {
  switch (size) {
    case "SMALL_2x3":
      return "2×3";
    case "MEDIUM_3x4":
      return "3×4";
    case "LARGE_4x6":
      return "4×6";
  }
}

export function buildEmailHtml({ order, zipStrategy, zipUrl }: SendEmailOptions) {
  const rows = [
    ["Order ID", order.id],
    ["Name", order.customerName],
    ["Phone", order.phone],
    ["Email", order.email ?? "-"] ,
    ["Address", order.address.replace(/\n/g, "<br/>")],
    ["Print size", sizeLabel(order.size)],
    ["Qty / photo", order.quantityPerPhoto.toString()],
    ["Files", order.fileCount.toString()],
    ["Total", formatCurrency(order.total)],
  ];

  const filesList = order.files
    .map(
      (file) =>
        `<li><strong>${file.originalName}</strong> — ${(file.sizeBytes / (1024 * 1024)).toFixed(2)} MB</li>`
    )
    .join("");

  const downloadSection =
    zipStrategy === "link" && zipUrl
      ? `<p style="margin-top:16px"><a href="${zipUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Download ZIP</a></p>`
      : "";

  return `
    <h1 style="font-family:Inter,Arial,sans-serif;color:#111">New Polaroid Order</h1>
    <table style="width:100%;max-width:480px;border-collapse:collapse;font-family:Inter,Arial,sans-serif;">
      ${rows
        .map(
          ([label, value]) => `
            <tr>
              <td style="border-bottom:1px solid #e5e7eb;padding:8px 12px;font-weight:600;color:#111;">${label}</td>
              <td style="border-bottom:1px solid #e5e7eb;padding:8px 12px;color:#374151;">${value}</td>
            </tr>
          `
        )
        .join("")}
    </table>
    <h2 style="font-family:Inter,Arial,sans-serif;color:#111;margin-top:24px;">Files</h2>
    <ul style="padding-left:16px;font-family:Inter,Arial,sans-serif;color:#374151;">
      ${filesList}
    </ul>
    ${downloadSection}
  `;
}

export function buildEmailText({ order, zipStrategy, zipUrl }: SendEmailOptions) {
  const lines = [
    `Order ID: ${order.id}`,
    `Name: ${order.customerName}`,
    `Phone: ${order.phone}`,
    `Email: ${order.email ?? "-"}`,
    `Address: ${order.address}`,
    `Print size: ${sizeLabel(order.size)}`,
    `Quantity per photo: ${order.quantityPerPhoto}`,
    `Files: ${order.fileCount}`,
    `Total: ${formatCurrency(order.total)}`,
    "",
    "Files:",
    ...order.files.map(
      (file) => `- ${file.originalName} (${(file.sizeBytes / (1024 * 1024)).toFixed(2)} MB)`
    ),
  ];

  if (zipStrategy === "link" && zipUrl) {
    lines.push("", `Download: ${zipUrl}`);
  }

  return lines.join("\n");
}

export async function sendOrderEmail(options: SendEmailOptions) {
  const mailer = getTransporter();
  const html = buildEmailHtml(options);
  const text = buildEmailText(options);

  const attachments =
    options.zipStrategy === "attachment" && options.zipPath
      ? [
          {
            filename: `${options.order.id}.zip`,
            path: options.zipPath,
            contentType: "application/zip",
          },
        ]
      : [];

  const info = await mailer.sendMail({
    from: env.GMAIL_FROM,
    to: env.GMAIL_TO,
    subject: `New Polaroid Order — ${options.order.id}`,
    html,
    text,
    attachments,
  });

  return info;
}

export type { ZipStrategy };
