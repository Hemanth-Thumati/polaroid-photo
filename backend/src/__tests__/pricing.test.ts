import { describe, expect, it } from "vitest";
import { calculateTotal, formatCurrency } from "../utils/pricing";

describe("pricing utils", () => {
  it("calculates totals using pricing table", () => {
    const total = calculateTotal({
      size: "SMALL_2x3" as any,
      fileCount: 5,
      quantityPerPhoto: 2,
    });

    expect(total).toBe(5 * 2 * 1500);
  });

  it("formats currency in INR", () => {
    expect(formatCurrency(123456)).toContain("₹");
  });
});
