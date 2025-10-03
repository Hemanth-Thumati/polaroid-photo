import { describe, expect, it, afterAll } from "vitest";
import fs from "fs/promises";
import path from "path";
import { createZipFromFiles } from "../services/zipper";
import { prepareOrderDirectories, uploadsRoot } from "../services/storage";

const orderId = `test-${Date.now()}`;

afterAll(async () => {
  await fs.rm(path.join(uploadsRoot, orderId), { recursive: true, force: true });
});

describe("zipper", () => {
  it("creates a zip with provided files", async () => {
    const { originals } = await prepareOrderDirectories(orderId);
    const filePath = path.join(originals, "sample.txt");
    await fs.writeFile(filePath, "hello world");

    const result = await createZipFromFiles(orderId, [{ path: filePath, name: "sample.txt" }]);

    const stats = await fs.stat(result.zipPath);
    expect(stats.size).toBeGreaterThan(0);
  });
});
