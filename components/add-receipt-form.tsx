"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AddReceiptFormProps = {
  vehicleId: string;
  userId: string;
  currentOdometer: number;
};

export function AddReceiptForm({
  vehicleId,
  userId,
  currentOdometer,
}: AddReceiptFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceDate, setServiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [odometer, setOdometer] = useState(String(currentOdometer));
  const [workshopName, setWorkshopName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [itemsSummary, setItemsSummary] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const odometerValue = Number(odometer);
    const supabase = createClient();

    const { error: insertError } = await supabase.from("receipts").insert({
      vehicle_id: vehicleId,
      user_id: userId,
      service_date: serviceDate,
      odometer: odometerValue,
      workshop_name: workshopName.trim(),
      total_amount: Number(totalAmount),
      items_summary: itemsSummary.trim(),
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    if (odometerValue > currentOdometer) {
      await supabase
        .from("vehicles")
        .update({ current_odometer: odometerValue })
        .eq("id", vehicleId);
    }

    setWorkshopName("");
    setTotalAmount("");
    setItemsSummary("");
    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-3 py-3 text-sm font-medium text-blue-600"
      >
        <Plus className={`h-4 w-4 transition-transform ${open ? "rotate-45" : ""}`} />
        Add receipt
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="space-y-3 border-t border-slate-200 px-3 pb-3 pt-3">
          <div>
            <label htmlFor={`date-${vehicleId}`} className="mb-1 block text-xs font-medium text-slate-600">
              Service Date
            </label>
            <input
              id={`date-${vehicleId}`}
              type="date"
              required
              value={serviceDate}
              onChange={(event) => setServiceDate(event.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor={`odo-${vehicleId}`} className="mb-1 block text-xs font-medium text-slate-600">
              Odometer (km)
            </label>
            <input
              id={`odo-${vehicleId}`}
              type="number"
              required
              min={0}
              value={odometer}
              onChange={(event) => setOdometer(event.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor={`workshop-${vehicleId}`} className="mb-1 block text-xs font-medium text-slate-600">
              Workshop Name
            </label>
            <input
              id={`workshop-${vehicleId}`}
              required
              value={workshopName}
              onChange={(event) => setWorkshopName(event.target.value)}
              placeholder="e.g. ABC Auto Service"
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor={`amount-${vehicleId}`} className="mb-1 block text-xs font-medium text-slate-600">
              Total Amount (RM)
            </label>
            <input
              id={`amount-${vehicleId}`}
              type="number"
              required
              min={0}
              step="0.01"
              value={totalAmount}
              onChange={(event) => setTotalAmount(event.target.value)}
              placeholder="250.00"
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor={`items-${vehicleId}`} className="mb-1 block text-xs font-medium text-slate-600">
              Items Summary
            </label>
            <textarea
              id={`items-${vehicleId}`}
              required
              rows={3}
              value={itemsSummary}
              onChange={(event) => setItemsSummary(event.target.value)}
              placeholder="Engine oil change, oil filter, alignment..."
              className="input-field resize-none"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full text-sm">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Save receipt
          </button>
        </form>
      )}
    </div>
  );
}
