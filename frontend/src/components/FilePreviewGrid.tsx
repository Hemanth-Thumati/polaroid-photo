import { useFilePreviews } from "../lib/hooks";
import { MAX_FILES } from "../lib/constants";

interface FilePreviewGridProps {
  files: File[];
  onRemove: (index: number) => void;
}

export function FilePreviewGrid({ files, onRemove }: FilePreviewGridProps) {
  const previews = useFilePreviews(files);

  if (!files.length) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-slate-600">Selected Photos ({files.length}/{MAX_FILES})</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {files.map((file, index) => {
          const preview = previews[index];
          const isImage = file.type.startsWith("image/") && !file.type.includes("heic");
          return (
            <div
              key={`${file.name}-${index}`}
              className="relative rounded-lg border border-slate-200 overflow-hidden shadow-sm bg-white"
            >
              {isImage && preview ? (
                <img src={preview} alt={file.name} className="w-full h-32 object-cover" />
              ) : (
                <div className="w-full h-32 flex items-center justify-center bg-slate-100 text-slate-500 text-xs">
                  Preview unavailable
                </div>
              )}
              <div className="p-2 text-xs text-slate-600 truncate">{file.name}</div>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                aria-label={`Remove ${file.name}`}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
