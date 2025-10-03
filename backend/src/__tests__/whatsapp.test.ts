import { describe, expect, it } from "vitest";
import { buildWhatsAppMessage } from "../services/whatsapp";

const baseOrder = {
  id: "order1",
  createdAt: new Date(),
  customerName: "Alice",
  phone: "+911234567890",
  email: "alice@example.com",
  address: "123 Street",
  size: "MEDIUM_3x4" as any,
  quantityPerPhoto: 2,
  notes: null,
  total: 5000,
  status: "RECEIVED" as any,
  zipPath: null,
  zipUrl: null,
  fileCount: 3,
  files: [
    {
      id: "file1",
      orderId: "order1",
      originalName: "file1.jpg",
      storedPath: "order1/file1.jpg",
      sizeBytes: 1000,
      mimeType: "image/jpeg",
    },
  ],
};

describe("buildWhatsAppMessage", () => {
  it("includes order basics and link", () => {
    const message = buildWhatsAppMessage({
      order: baseOrder,
      zipStrategy: "link",
      zipUrl: "https://example.com/zip",
    });

    expect(message).toContain("order1");
    expect(message).toContain("https://example.com/zip");
  });
});
