"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Plus, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AddReceiptFormProps = {
  vehicleId: string;
  userId: string;
  currentOdometer: number;
};

type ScanResult = {
  service_date: string | null;
  odometer: number | null;
  workshop_name: string | null;
  total_amount: number | null;
  items_summary: string | null;
};

export function AddReceiptForm({
  vehicleId,
  userId,
  currentOdometer,
}: AddReceiptFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [serviceDate, setServiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [odometer, setOdometer] = useState(String(currentOdometer));
  const [workshopName, setWorkshopName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [itemsSummary, setItemsSummary] = useState("");

  async function handleScan(file: File) {
    setScanning(true);
    setError(null);
    setScanSuccess(null);

    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1] ?? dataUrl;
        const mimeType = file.type || "image/jpeg";

        const response = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, mimeType }),
        });

        const data = (await response.json()) as ScanResult & { error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to scan receipt.");
        }

        if (data.service_date) {
          setServiceDate(data.service_date);
        }
        if (data.odometer !== null) {
          setOdometer(String(data.odometer));
        }
        if (data.workshop_name) {
          setWorkshopName(data.workshop_name);
        }
        if (data.total_amount !== null) {
          setTotalAmount(String(data.total_amount));
        }
        if (data.items_summary) {
          setItemsSummary(data.items_summary);
        }

        setScanSuccess(
          "Receipt read successfully! Please verify and edit details before saving."
        );
      } catch (scanError) {
        setError(
          scanError instanceof Error
            ? scanError.message
            : "Failed to scan receipt."
        );
      } finally {
        setScanning(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };

    reader.onerror = () => {
      setError("Could not read the selected image.");
      setScanning(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    reader.readAsDataURL(file);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void handleScan(file);
    }
  }

  function handleScanClick() {
    setOpen(true);
    fileInputRef.current?.click();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setScanSuccess(null);

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
      setSaving(false);
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
    setSaving(false);
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            type="button"
            onClick={handleScanClick}
            disabled={scanning || saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {scanning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                OtoRekod AI reading receipt...
              </>
            ) : (
              <>
                <Camera className="h-4 w-4" />
                Scan Receipt with AI
              </>
            )}
          </button>

          {scanSuccess && (
            <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {scanSuccess}
            </p>
          )}

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

          <button type="submit" disabled={saving || scanning} className="btn-primary w-full text-sm">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save receipt
          </button>
        </form>
      )}
    </div>
  );
}
