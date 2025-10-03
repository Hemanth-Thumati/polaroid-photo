import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env";

const uploadsRoot = path.resolve(process.cwd(), "uploads");

const s3Client = env.USE_S3
  ? new S3Client({
      region: env.S3_REGION || "us-east-1",
      endpoint: env.S3_ENDPOINT || undefined,
      forcePathStyle: Boolean(env.S3_ENDPOINT),
      credentials:
        env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
          ? {
              accessKeyId: env.S3_ACCESS_KEY_ID,
              secretAccessKey: env.S3_SECRET_ACCESS_KEY,
            }
          : undefined,
    })
  : null;

export function ensureUploadsRoot() {
  if (!fs.existsSync(uploadsRoot)) {
    fs.mkdirSync(uploadsRoot, { recursive: true });
  }
}

export function getOrderDirectories(orderId: string) {
  const base = path.join(uploadsRoot, orderId);
  const originals = path.join(base, "originals");
  return { base, originals };
}

export async function prepareOrderDirectories(orderId: string) {
  ensureUploadsRoot();
  const { base, originals } = getOrderDirectories(orderId);
  await fsp.mkdir(originals, { recursive: true });
  return { base, originals };
}

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

export async function writeOriginalFile(options: {
  orderId: string;
  originalName: string;
  buffer: Buffer;
}): Promise<{ storedPath: string; absolutePath: string }>
export async function writeOriginalFile({ orderId, originalName, buffer }: {
  orderId: string;
  originalName: string;
  buffer: Buffer;
}) {
  const { originals } = await prepareOrderDirectories(orderId);
  const safeName = sanitizeFilename(originalName);
  const absolutePath = path.join(originals, safeName);
  await fsp.writeFile(absolutePath, buffer);
  const storedPath = path.relative(uploadsRoot, absolutePath);
  return { storedPath, absolutePath };
}

export async function createZipPath(orderId: string) {
  const { base } = await prepareOrderDirectories(orderId);
  const zipPath = path.join(base, `${orderId}.zip`);
  return { zipPath, relativePath: path.relative(uploadsRoot, zipPath) };
}

export async function uploadZipToS3({
  orderId,
  zipPath,
}: {
  orderId: string;
  zipPath: string;
}): Promise<{ url: string } | null> {
  if (!s3Client || !env.S3_BUCKET) {
    return null;
  }
  const key = `${orderId}/${path.basename(zipPath)}`;
  const body = await fsp.readFile(zipPath);
  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: "application/zip",
    })
  );
  const url = await getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    }),
    { expiresIn: 60 * 60 * 24 * 7 }
  );
  return { url };
}

export function buildLocalPublicUrl(relativePath: string) {
  const origin = env.APP_BASE_URL.replace(/\/$/, "");
  return `${origin}/uploads/${relativePath.replace(/\\/g, "/")}`;
}

export { uploadsRoot };
