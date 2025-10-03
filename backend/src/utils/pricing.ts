import { PrintSize } from "@prisma/client";
import { env } from "../env";

export function calculateTotal({
  size,
  fileCount,
  quantityPerPhoto,
}: {
  size: PrintSize;
  fileCount: number;
  quantityPerPhoto: number;
}): number {
  const pricePerPrint = env.pricing[size];
  return fileCount * quantityPerPhoto * pricePerPrint;
}

export function formatCurrency(paise: number): string {
  return (paise / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
}
