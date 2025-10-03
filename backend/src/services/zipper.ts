import fs from "fs";
import archiver from "archiver";
import { createZipPath } from "./storage";

export interface ZipResult {
  zipPath: string;
  size: number;
}

export async function createZipFromFiles(orderId: string, files: Array<{ path: string; name: string }>): Promise<ZipResult> {
  const { zipPath } = await createZipPath(orderId);
  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve());
    output.on("error", (err) => reject(err));
    archive.on("error", (err) => reject(err));

    archive.pipe(output);

    for (const file of files) {
      archive.file(file.path, { name: file.name });
    }

    archive.finalize().catch(reject);
  });

  const stats = await fs.promises.stat(zipPath);
  return { zipPath, size: stats.size };
}
