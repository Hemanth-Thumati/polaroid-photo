import express from "express";
import multer from "multer";
import path from "path";
import { createId } from "@paralleldrive/cuid2";
import { OrderStatus, PrintSize } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { orderMetadataSchema, allowedMimeTypes, allowedExtensions } from "../validation";
import { calculateTotal } from "../utils/pricing";
import {
  writeOriginalFile,
  uploadZipToS3,
  buildLocalPublicUrl,
  prepareOrderDirectories,
  uploadsRoot,
} from "../services/storage";
import { createZipFromFiles } from "../services/zipper";
import { sendOrderEmail } from "../services/email";
import { sendWhatsAppNotification } from "../services/whatsapp";
import { env } from "../env";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 30,
    fileSize: 15 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
    }
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.has(ext)) {
      return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
    }
    cb(null, true);
  },
});

export const ordersRouter = express.Router();

ordersRouter.post(
  "/",
  upload.array("files", 30),
  async (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "At least one photo is required",
        });
      }

      if (!req.body.metadata) {
        return res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Missing order metadata",
        });
      }

      let parsed;
      try {
        parsed = orderMetadataSchema.parse(
          typeof req.body.metadata === "string" ? JSON.parse(req.body.metadata) : req.body.metadata
        );
      } catch (error) {
        return res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Invalid metadata",
          details: error instanceof Error ? error.message : error,
        });
      }

      const files = req.files as Express.Multer.File[];

      if (files.length > 30) {
        return res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Too many files uploaded",
        });
      }

      const totalPayload = files.reduce((sum, file) => sum + file.size, 0);
      if (totalPayload > env.MAX_UPLOAD_SIZE_MB * 1024 * 1024) {
        return res.status(413).json({
          code: "UPLOAD_TOO_LARGE",
          message: `Total upload exceeds ${env.MAX_UPLOAD_SIZE_MB} MB limit`,
        });
      }

      const orderId = createId();
      await prepareOrderDirectories(orderId);

      const savedFiles: {
        originalName: string;
        storedPath: string;
        absolutePath: string;
        sizeBytes: number;
        mimeType: string;
      }[] = [];

      for (const file of files) {
        const { storedPath, absolutePath } = await writeOriginalFile({
          orderId,
          originalName: file.originalname,
          buffer: file.buffer,
        });
        savedFiles.push({
          originalName: file.originalname,
          storedPath,
          absolutePath,
          sizeBytes: file.size,
          mimeType: file.mimetype,
        });
      }

      const total = calculateTotal({
        size: parsed.size as PrintSize,
        fileCount: savedFiles.length,
        quantityPerPhoto: parsed.quantityPerPhoto,
      });

      const zipResult = await createZipFromFiles(
        orderId,
        savedFiles.map((file) => ({ path: file.absolutePath, name: file.originalName }))
      );

      let zipStrategy: "attachment" | "link" = "attachment";
      let zipUrl: string | null = null;
      let zipPath: string | null = zipResult.zipPath;
      const relativeZipPath = path.relative(uploadsRoot, zipResult.zipPath);

      if (zipResult.size > 20 * 1024 * 1024) {
        zipStrategy = "link";
        if (env.USE_S3) {
          const uploaded = await uploadZipToS3({ orderId, zipPath: zipResult.zipPath });
          zipUrl = uploaded?.url ?? null;
        }
        if (!zipUrl) {
          zipUrl = buildLocalPublicUrl(relativeZipPath);
        }
        zipPath = zipResult.zipPath;
      } else {
        zipUrl = buildLocalPublicUrl(relativeZipPath);
      }

      const orderRecord = await prisma.order.create({
        data: {
          id: orderId,
          customerName: parsed.customerName,
          phone: parsed.phone,
          email: parsed.email || null,
          address: parsed.address,
          size: parsed.size as PrintSize,
          quantityPerPhoto: parsed.quantityPerPhoto,
          notes: parsed.notes || null,
          total,
          status: OrderStatus.RECEIVED,
          zipPath: zipPath ? relativeZipPath : null,
          zipUrl,
          fileCount: savedFiles.length,
          files: {
            create: savedFiles.map((file) => ({
              originalName: file.originalName,
              storedPath: file.storedPath,
              sizeBytes: file.sizeBytes,
              mimeType: file.mimeType,
            })),
          },
        },
        include: { files: true },
      });

      const notifications: { whatsapp: "sent" | "failed" | "skipped"; email: "sent" | "failed" | "skipped" } = {
        whatsapp: "skipped",
        email: "skipped",
      };

      try {
        await sendWhatsAppNotification({ order: orderRecord, zipStrategy, zipUrl });
        notifications.whatsapp = "sent";
        await prisma.order.update({
          where: { id: orderRecord.id },
          data: { status: OrderStatus.NOTIFIED },
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes("No WhatsApp provider")) {
          notifications.whatsapp = "skipped";
        } else {
          notifications.whatsapp = "failed";
        }
      }

      try {
        await sendOrderEmail({
          order: orderRecord,
          zipStrategy,
          zipPath: zipPath ?? undefined,
          zipUrl: zipUrl ?? undefined,
        });
        notifications.email = "sent";
        await prisma.order.update({
          where: { id: orderRecord.id },
          data: { status: OrderStatus.EMAILED },
        });
      } catch (error) {
        notifications.email = "failed";
        await prisma.order.update({
          where: { id: orderRecord.id },
          data: { status: OrderStatus.FAILED },
        });
      }

      return res.status(201).json({
        orderId,
        total,
        zipStrategy,
        zipUrl,
        notifications,
      });
    } catch (error) {
      if (error instanceof multer.MulterError) {
        let message = error.message;
        if (error.code === "LIMIT_FILE_SIZE") {
          message = "File exceeds 15 MB limit";
        }
        return res.status(400).json({
          code: "VALIDATION_ERROR",
          message,
        });
      }

      console.error(error);
      return res.status(500).json({
        code: "SERVER_ERROR",
        message: "Unexpected error",
      });
    }
  }
);

ordersRouter.get("/:orderId", async (req, res) => {
  const apiKey = req.headers["x-api-key"];
  if (apiKey !== env.ADMIN_API_KEY) {
    return res.status(401).json({ code: "UNAUTHORIZED", message: "Invalid API key" });
  }

  const order = await prisma.order.findUnique({
    where: { id: req.params.orderId },
    include: { files: true },
  });

  if (!order) {
    return res.status(404).json({ code: "NOT_FOUND", message: "Order not found" });
  }

  return res.json(order);
});
