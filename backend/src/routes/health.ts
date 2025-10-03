import express from "express";
import fs from "fs/promises";
import path from "path";
import { prisma } from "../lib/prisma";
import { ensureUploadsRoot, uploadsRoot } from "../services/storage";

export const healthRouter = express.Router();

healthRouter.get("/", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    ensureUploadsRoot();
    const testFile = path.join(uploadsRoot, ".healthcheck");
    await fs.writeFile(testFile, "ok");
    await fs.unlink(testFile);
    return res.json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : error });
  }
});
