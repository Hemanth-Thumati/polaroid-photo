import { describe, expect, it } from "vitest";
import { buildEmailHtml, buildEmailText } from "../services/email";

const order = {
  id: "order1",
  createdAt: new Date(),
  customerName: "Alice",
  phone: "+911234567890",
  email: "alice@example.com",
  address: "123 Street",
  size: "SMALL_2x3" as any,
  quantityPerPhoto: 1,
  notes: null,
  total: 1500,
  status: "RECEIVED" as any,
  zipPath: "order1/order1.zip",
  zipUrl: "http://localhost/uploads/order1/order1.zip",
  fileCount: 1,
  files: [
    {
      id: "file1",
      orderId: "order1",
      originalName: "img.jpg",
      storedPath: "order1/img.jpg",
      sizeBytes: 1024,
      mimeType: "image/jpeg",
    },
  ],
};

describe("email composer", () => {
  it("builds html with order details", () => {
    const html = buildEmailHtml({ order, zipStrategy: "link", zipUrl: order.zipUrl });
    expect(html).toContain("New Polaroid Order");
    expect(html).toContain(order.customerName);
  });

  it("builds text fallback", () => {
    const text = buildEmailText({ order, zipStrategy: "link", zipUrl: order.zipUrl });
    expect(text).toContain("Download");
  });
});
