"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Share2, X } from "lucide-react";

type ShareHistoryModalProps = {
  vehicleId: string;
  vehicleLabel: string;
  open: boolean;
  onClose: () => void;
};

export function ShareHistoryModal({
  vehicleId,
  vehicleLabel,
  open,
  onClose,
}: ShareHistoryModalProps) {
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setShareUrl(`${window.location.origin}/shared/${vehicleId}`);
      setCopied(false);
    }
  }, [open, vehicleId]);

  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close share dialog"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2 text-blue-600">
              <Share2 className="h-4 w-4" />
              <p className="text-sm font-semibold">Share History</p>
            </div>
            <p className="text-sm text-slate-600">
              Share the health passport for{" "}
              <span className="font-medium text-slate-900">{vehicleLabel}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-2 text-xs font-medium text-slate-500">
          Paste this link in Mudah.my, Carousell, or Facebook Marketplace:
        </p>

        <div className="flex gap-2">
          <input
            readOnly
            value={shareUrl}
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Link
              </>
            )}
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Only vehicle and service details are shown — no owner information.
        </p>
      </div>
    </div>
  );
}
