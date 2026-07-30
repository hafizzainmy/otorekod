import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Car,
  Gauge,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";

type SharedReceipt = {
  service_date: string;
  odometer: number;
  workshop_name: string;
  total_amount: number;
  items_summary: string;
};

type SharedVehicle = {
  id: string;
  make: string;
  model: string;
  year: number;
  current_odometer: number;
};

type PageProps = {
  params: Promise<{ vehicleId: string }>;
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
  }).format(amount);
}

async function getSharedVehicleData(vehicleId: string) {
  const supabase = createServiceClient();

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("id, make, model, year, current_odometer")
    .eq("id", vehicleId)
    .single();

  if (vehicleError || !vehicle) {
    return null;
  }

  const { data: receipts, error: receiptsError } = await supabase
    .from("receipts")
    .select(
      "service_date, odometer, workshop_name, total_amount, items_summary"
    )
    .eq("vehicle_id", vehicleId)
    .order("service_date", { ascending: true });

  if (receiptsError) {
    return null;
  }

  return {
    vehicle: vehicle as SharedVehicle,
    receipts: (receipts ?? []) as SharedReceipt[],
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { vehicleId } = await params;
  const data = await getSharedVehicleData(vehicleId);

  if (!data) {
    return { title: "Passport Not Found — OtoRekod" };
  }

  const { vehicle } = data;

  return {
    title: `${vehicle.year} ${vehicle.make} ${vehicle.model} — Health Passport`,
    description: `Verified service history for a ${vehicle.year} ${vehicle.make} ${vehicle.model}. ${vehicle.current_odometer.toLocaleString("en-MY")} km recorded.`,
  };
}

export default async function SharedVehiclePage({ params }: PageProps) {
  const { vehicleId } = await params;
  const data = await getSharedVehicleData(vehicleId);

  if (!data) {
    notFound();
  }

  const { vehicle, receipts } = data;

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-4 py-8">
      <div className="mx-auto max-w-lg">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl shadow-black/30">
          <div className="bg-gradient-to-br from-slate-900 to-blue-900 px-6 py-8 text-white">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-emerald-400" />
                <span className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                  OtoRekod
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/40">
                <BadgeCheck className="h-3.5 w-3.5" />
                Verified History
              </span>
            </div>

            <p className="text-xs font-medium uppercase tracking-[0.2em] text-blue-200/80">
              Vehicle Health Passport
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">
              {vehicle.make} {vehicle.model}
            </h1>
            <p className="mt-1 text-blue-100/80">Model year {vehicle.year}</p>

            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Gauge className="h-5 w-5 text-blue-200" />
              </div>
              <div>
                <p className="text-xs text-blue-200/70">Current odometer</p>
                <p className="text-lg font-semibold">
                  {vehicle.current_odometer.toLocaleString("en-MY")} km
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-7">
            <div className="mb-6 flex items-center gap-2">
              <Car className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Service Timeline
              </h2>
            </div>

            {receipts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
                <Wrench className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">
                  No service records published yet
                </p>
              </div>
            ) : (
              <ol className="relative space-y-0 border-l-2 border-blue-100 pl-6">
                {receipts.map((receipt, index) => (
                  <li key={`${receipt.service_date}-${index}`} className="relative pb-8 last:pb-0">
                    <span className="absolute -left-[1.65rem] top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-600 ring-4 ring-white" />
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {formatDate(receipt.service_date)}
                          </p>
                          <p className="text-sm text-slate-600">
                            {receipt.workshop_name}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-blue-700">
                          {formatCurrency(receipt.total_amount)}
                        </p>
                      </div>

                      <p className="mt-3 text-sm leading-relaxed text-slate-700">
                        {receipt.items_summary}
                      </p>

                      <p className="mt-3 inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                        <Gauge className="h-3 w-3" />
                        {receipt.odometer.toLocaleString("en-MY")} km
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
            <p className="text-center text-xs leading-relaxed text-slate-500">
              Verified via OtoRekod — Tamper-resistant digital registry.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Owner details are never shown on shared passports.
        </p>
      </div>
    </div>
  );
}
