"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AddVehicleFormProps = {
  userId: string;
};

export function AddVehicleForm({ userId }: AddVehicleFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plateNumber, setPlateNumber] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [currentOdometer, setCurrentOdometer] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("vehicles").insert({
      user_id: userId,
      plate_number: plateNumber.trim().toUpperCase(),
      make: make.trim(),
      model: model.trim(),
      year: Number(year),
      current_odometer: Number(currentOdometer),
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setPlateNumber("");
    setMake("");
    setModel("");
    setYear("");
    setCurrentOdometer("");
    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-4 py-4 text-left"
      >
        <div>
          <h2 className="font-semibold text-slate-900">Add Vehicle</h2>
          <p className="text-sm text-slate-500">Register a car to track</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Plus className={`h-5 w-5 transition-transform ${open ? "rotate-45" : ""}`} />
        </span>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="space-y-4 border-t border-slate-100 px-4 pb-4 pt-4">
          <div>
            <label htmlFor="plate" className="mb-1.5 block text-sm font-medium text-slate-700">
              Plate Number
            </label>
            <input
              id="plate"
              required
              value={plateNumber}
              onChange={(event) => setPlateNumber(event.target.value)}
              placeholder="e.g. WXY 1234"
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="make" className="mb-1.5 block text-sm font-medium text-slate-700">
                Make
              </label>
              <input
                id="make"
                required
                value={make}
                onChange={(event) => setMake(event.target.value)}
                placeholder="Proton"
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="model" className="mb-1.5 block text-sm font-medium text-slate-700">
                Model
              </label>
              <input
                id="model"
                required
                value={model}
                onChange={(event) => setModel(event.target.value)}
                placeholder="Saga"
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="year" className="mb-1.5 block text-sm font-medium text-slate-700">
                Year
              </label>
              <input
                id="year"
                type="number"
                required
                min={1980}
                max={2030}
                value={year}
                onChange={(event) => setYear(event.target.value)}
                placeholder="2020"
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="odometer" className="mb-1.5 block text-sm font-medium text-slate-700">
                Current Odometer (km)
              </label>
              <input
                id="odometer"
                type="number"
                required
                min={0}
                value={currentOdometer}
                onChange={(event) => setCurrentOdometer(event.target.value)}
                placeholder="45000"
                className="input-field"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Save vehicle
          </button>
        </form>
      )}
    </section>
  );
}
