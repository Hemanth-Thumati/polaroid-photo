import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "clsx";
import { orderFormSchema, OrderFormValues } from "./lib/schema";
import {
  ACCEPTED_TYPES,
  ACCEPTED_EXTENSIONS,
  MAX_FILE_SIZE_MB,
  MAX_FILES,
  PRICE_PER_PRINT,
  PRINT_SIZES,
  PrintSize,
} from "./lib/constants";
import { FilePreviewGrid } from "./components/FilePreviewGrid";
import { ProgressBar } from "./components/ProgressBar";
import { SuccessState } from "./components/SuccessState";

interface SubmitResponse {
  orderId: string;
  total: number;
  zipStrategy: "attachment" | "link";
  zipUrl?: string | null;
  notifications?: {
    whatsapp: "sent" | "failed" | "skipped";
    email: "sent" | "failed" | "skipped";
  };
}

async function submitOrder(formData: FormData, onProgress: (value: number) => void): Promise<SubmitResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/orders");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const value = (event.loaded / event.total) * 100;
        onProgress(value);
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error"));
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100);
          resolve(data);
        } else {
          reject(new Error(data.message || "Failed to submit order"));
        }
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Unexpected response"));
      }
    };

    xhr.send(formData);
  });
}

function formatFileSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatPrice(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export default function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SubmitResponse | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
    reset,
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    mode: "onChange",
    defaultValues: {
      customerName: "",
      phone: "",
      email: "",
      address: "",
      size: PRINT_SIZES[0].value,
      quantityPerPhoto: 1,
      notes: "",
      agreeToTerms: false,
    },
  });

  const quantity = watch("quantityPerPhoto") ?? 1;
  const size = (watch("size") as PrintSize) ?? PRINT_SIZES[0].value;

  const totalPrice = useMemo(() => {
    return files.length * quantity * PRICE_PER_PRINT[size];
  }, [files.length, quantity, size]);

  const totalSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);

  const addFiles = useCallback((incoming: File[]) => {
    if (!incoming.length) {
      return;
    }

    setError(null);
    setResult(null);

    const reasons: string[] = [];

    setFiles((prev) => {
      const accepted: File[] = [];
      for (const file of incoming) {
        if (prev.length + accepted.length >= MAX_FILES) {
          reasons.push(`Cannot add more than ${MAX_FILES} files`);
          break;
        }
        const extension = file.name.includes(".") ? `.${file.name.split(".").pop()?.toLowerCase()}` : "";
        if (!ACCEPTED_TYPES.includes(file.type) && !ACCEPTED_EXTENSIONS.includes(extension)) {
          reasons.push(`${file.name} is not an accepted file type`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          reasons.push(`${file.name} exceeds ${MAX_FILE_SIZE_MB} MB`);
          continue;
        }
        accepted.push(file);
      }

      if (accepted.length) {
        return [...prev, ...accepted];
      }
      return prev;
    });

    if (reasons.length) {
      setError(reasons.join(". "));
    }
  }, []);

  const handleFileInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = event.target.files ? Array.from(event.target.files) : [];
      addFiles(next);
      event.target.value = "";
    },
    [addFiles]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      const dropped = Array.from(event.dataTransfer.files || []);
      addFiles(dropped);
    },
    [addFiles]
  );

  const handleRemoveFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  const onSubmit = useCallback(
    async (values: OrderFormValues) => {
      if (!files.length) {
        setError("Please add at least one photo");
        return;
      }

      setSubmitting(true);
      setError(null);
      setProgress(0);

      const formData = new FormData();
      formData.append(
        "metadata",
        JSON.stringify({
          ...values,
          email: values.email || undefined,
          notes: values.notes || undefined,
        })
      );
      files.forEach((file) => formData.append("files", file));

      try {
        const response = await submitOrder(formData, setProgress);
        setResult(response);
        setFiles([]);
        reset();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Failed to submit order");
      } finally {
        setSubmitting(false);
        setProgress(0);
      }
    },
    [files, reset]
  );

  const isSubmitDisabled = submitting || !isValid || files.length === 0;

  if (result) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <header className="py-6 shadow-sm bg-white">
          <div className="max-w-5xl mx-auto px-4">
            <h1 className="text-2xl font-semibold text-slate-900">Polaroid Prints</h1>
            <p className="text-slate-500">Custom prints delivered to your doorstep</p>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="space-y-6">
            <SuccessState
              orderId={result.orderId}
              total={result.total}
              zipStrategy={result.zipStrategy}
              zipUrl={result.zipUrl}
              notifications={result.notifications}
            />
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                }}
                className="inline-flex items-center justify-center rounded-xl bg-primary text-white px-6 py-3 font-medium shadow"
              >
                Place another order
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="py-6 shadow-sm bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="text-2xl font-semibold text-slate-900">Polaroid Prints</h1>
          <p className="text-slate-500">Upload your photos, choose your prints, and we'll handle the rest.</p>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
          <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Contact details</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-600">Name *</label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    {...register("customerName")}
                  />
                  {errors.customerName ? (
                    <p className="mt-1 text-sm text-red-600">{errors.customerName.message}</p>
                  ) : null}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600">Phone *</label>
                  <input
                    type="tel"
                    placeholder="+911234567890"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    {...register("phone")}
                  />
                  {errors.phone ? <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p> : null}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600">Email</label>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    {...register("email")}
                  />
                  {errors.email ? <p className="mt-1 text-sm text-red-600">{errors.email.message}</p> : null}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-600">Shipping address *</label>
                  <textarea
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    {...register("address")}
                  />
                  {errors.address ? <p className="mt-1 text-sm text-red-600">{errors.address.message}</p> : null}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Print preferences</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-600">Print size *</label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    {...register("size")}
                  >
                    {PRINT_SIZES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600">Quantity per photo *</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    {...register("quantityPerPhoto", { valueAsNumber: true })}
                  />
                  {errors.quantityPerPhoto ? (
                    <p className="mt-1 text-sm text-red-600">{errors.quantityPerPhoto.message}</p>
                  ) : null}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-600">Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Any special instructions?"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    {...register("notes")}
                  />
                  {errors.notes ? <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p> : null}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Upload photos</h2>
              <label
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                className={clsx(
                  "border-2 border-dashed rounded-2xl p-6 text-center transition-colors cursor-pointer",
                  "border-slate-300 hover:border-primary bg-slate-50"
                )}
              >
                <input
                  type="file"
                  accept={ACCEPTED_EXTENSIONS.join(",")}
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                />
                <div className="space-y-2">
                  <p className="font-medium text-slate-700">Drag & drop your photos here, or click to browse</p>
                  <p className="text-sm text-slate-500">
                    Up to {MAX_FILES} files · {MAX_FILE_SIZE_MB} MB max each · JPG, PNG, HEIC
                  </p>
                  <p className="text-xs text-slate-400">Current selection: {files.length} files · {formatFileSize(totalSize)}</p>
                </div>
              </label>

              <FilePreviewGrid files={files} onRemove={handleRemoveFile} />
              {error ? <div className="text-sm text-red-600">{error}</div> : null}
            </section>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="agree" className="h-4 w-4" {...register("agreeToTerms")}/>
              <label htmlFor="agree" className="text-sm text-slate-600">
                I agree to the <a href="#" className="text-primary underline">Terms</a> &amp; <a href="#" className="text-primary underline">Privacy Policy</a>.
              </label>
            </div>
            {errors.agreeToTerms ? <p className="text-sm text-red-600">{errors.agreeToTerms.message}</p> : null}

            {submitting ? (
              <div className="space-y-2">
                <ProgressBar value={progress} />
                <p className="text-sm text-slate-500">Uploading… {progress.toFixed(0)}%</p>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitDisabled}
              className={clsx(
                "w-full rounded-xl py-3 text-white font-medium transition",
                isSubmitDisabled ? "bg-slate-300 cursor-not-allowed" : "bg-primary hover:bg-blue-600"
              )}
            >
              {submitting ? "Submitting…" : `Place order — ${formatPrice(totalPrice)}`}
            </button>
          </form>

          <aside className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Order summary</h3>
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Photos</span>
                  <span>{files.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Quantity / photo</span>
                  <span>{quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span>Price per print</span>
                  <span>{formatPrice(PRICE_PER_PRINT[size])}</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-900 border-t border-slate-200 pt-3">
                  <span>Total</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 space-y-3 text-sm text-slate-600">
              <h3 className="text-lg font-semibold text-slate-900">How it works</h3>
              <ol className="list-decimal list-inside space-y-1">
                <li>Upload up to {MAX_FILES} photos.</li>
                <li>We bundle them into a ZIP and confirm via email.</li>
                <li>You get an instant WhatsApp notification with order summary.</li>
              </ol>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
