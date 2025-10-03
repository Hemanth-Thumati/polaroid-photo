export const PRINT_SIZES = [
  { value: "SMALL_2x3", label: "2×3" },
  { value: "MEDIUM_3x4", label: "3×4" },
  { value: "LARGE_4x6", label: "4×6" },
] as const;

export type PrintSize = (typeof PRINT_SIZES)[number]["value"];

export const PRICE_PER_PRINT: Record<PrintSize, number> = {
  SMALL_2x3: 1500,
  MEDIUM_3x4: 2000,
  LARGE_4x6: 2500,
};

export const MAX_FILES = 30;
export const MAX_FILE_SIZE_MB = 15;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif"];
export const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".heic", ".heif"];
