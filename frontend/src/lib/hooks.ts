import { useEffect, useState } from "react";

export function useFilePreviews(files: File[]) {
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const nextPreviews = files.map((file) => URL.createObjectURL(file));
    setPreviews(nextPreviews);

    return () => {
      nextPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  return previews;
}
