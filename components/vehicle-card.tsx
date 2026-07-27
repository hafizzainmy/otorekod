"use client";

import { useState } from "react";
import { ChevronDown, Gauge, ReceiptText } from "lucide-react";
import type { VehicleWithReceipts } from "@/lib/types/database";
import { AddReceiptForm } from "@/components/add-receipt-form";

type VehicleCardProps = {
  vehicle: VehicleWithReceipts;
  userId: string;
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
  }).format(amount);
}

export function VehicleCard({ vehicle, userId }: VehicleCardProps) {
  const [expanded, setExpanded] = useState(true);
  const receipts = [...(vehicle.receipts ?? [])].sort(
    (a, b) =>
      new Date(b.service_date).getTime() - new Date(a.service_date).getTime()
  );

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-start gap-3 px-4 py-4 text-left"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
          {vehicle.plate_number.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-slate-900">
            {vehicle.plate_number}
          </p>
          <p className="text-sm text-slate-600">
            {vehicle.make} {vehicle.model} · {vehicle.year}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <Gauge className="h-3.5 w-3.5" />
            {vehicle.current_odometer.toLocaleString("en-MY")} km
          </p>
        </div>
        <ChevronDown
          className={`mt-1 h-5 w-5 shrink-0 text-slate-400 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4">
          <div className="mb-3 mt-4 flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-800">
              Service Records ({receipts.length})
            </h3>
          </div>

          {receipts.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
              No receipts yet. Add your first service record below.
            </p>
          ) : (
            <ul className="space-y-3">
              {receipts.map((receipt) => (
                <li
                  key={receipt.id}
                  className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">
                        {receipt.workshop_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(receipt.service_date)} ·{" "}
                        {receipt.odometer.toLocaleString("en-MY")} km
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-blue-700">
                      {formatCurrency(receipt.total_amount)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {receipt.items_summary}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <AddReceiptForm
            vehicleId={vehicle.id}
            userId={userId}
            currentOdometer={vehicle.current_odometer}
          />
        </div>
      )}
    </article>
  );
}
