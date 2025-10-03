interface SuccessStateProps {
  orderId: string;
  total: number;
  zipStrategy: "attachment" | "link";
  zipUrl?: string | null;
  notifications?: {
    whatsapp: "sent" | "failed" | "skipped";
    email: "sent" | "failed" | "skipped";
  };
}

export function SuccessState({ orderId, total, zipStrategy, zipUrl, notifications }: SuccessStateProps) {
  const formattedTotal = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(total / 100);

  return (
    <div className="max-w-xl mx-auto bg-white shadow-lg rounded-2xl p-8 text-center space-y-4">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 text-2xl">✓</div>
      <h2 className="text-2xl font-semibold text-slate-900">Thank you!</h2>
      <p className="text-slate-600">Your order has been received.</p>
      <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Order ID</span>
          <span className="font-semibold text-slate-900">{orderId}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Total</span>
          <span className="font-semibold text-slate-900">{formattedTotal}</span>
        </div>
        <div className="text-sm text-slate-500">
          A confirmation email will arrive shortly with your photos bundled in a ZIP.
        </div>
        {notifications ? (
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
            <div className="flex flex-col rounded-lg bg-white/60 p-2">
              <span className="font-medium text-slate-600">Email</span>
              <span className="capitalize">{notifications.email}</span>
            </div>
            <div className="flex flex-col rounded-lg bg-white/60 p-2">
              <span className="font-medium text-slate-600">WhatsApp</span>
              <span className="capitalize">{notifications.whatsapp}</span>
            </div>
          </div>
        ) : null}
        {zipStrategy === "link" && zipUrl ? (
          <a
            href={zipUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-full rounded-lg bg-primary text-white py-2.5 font-medium"
          >
            Download photos
          </a>
        ) : null}
      </div>
    </div>
  );
}
