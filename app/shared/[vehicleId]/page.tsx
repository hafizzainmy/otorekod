import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Car,
  Gauge,
  ShieldCheck,
  Wrench,
  FileText,
  MapPin,
  Phone,
  ExternalLink
} from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";

type SharedReceipt = {
  id: string;
  service_date: string;
  odometer: number;
  workshop_name: string;
  company_reg_no?: string;
  workshop_address?: string;
  workshop_phone?: string;
  invoice_no?: string;
  total_amount: number;
  items_summary: string;
  image_url?: string;
};

type SharedVehicle = {
  id: string;
  plate_number: string;
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

// Clean helper to parse line items JSON safely
function parseLineItems(summary: string): { isJson: boolean; items: any[] } {
  if (!summary) return { isJson: false, items: [] };
  try {
    const parsed = JSON.parse(summary);
    if (Array.isArray(parsed)) return { isJson: true, items: parsed };
  } catch (e) {}
  return {
    isJson: false,
    items: summary.split(",").map((i) => ({ description: i.trim() })),
  };
}

async function getSharedVehicleData(vehicleId: string) {
  const supabase = createServiceClient();

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("id, plate_number, make, model, year, current_odometer")
    .eq("id", vehicleId)
    .single();

  if (vehicleError || !vehicle) {
    return null;
  }

  const { data: receipts, error: receiptsError } = await supabase
    .from("receipts")
    .select(
      "id, service_date, odometer, workshop_name, company_reg_no, workshop_address, workshop_phone, invoice_no, total_amount, items_summary, image_url"
    )
    .eq("vehicle_id", vehicleId)
    .order("service_date", { ascending: false }); // Latest on top

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
    title: `${vehicle.plate_number ? `[${vehicle.plate_number}] ` : ""}${vehicle.year} ${vehicle.make} ${vehicle.model} — Health Passport`,
    description: `Verified service history for ${vehicle.make} ${vehicle.model} (${vehicle.plate_number}). ${vehicle.current_odometer.toLocaleString("en-MY")} km recorded.`,
  };
}

export default async function SharedVehiclePage({ params }: PageProps) {
  const { vehicleId } = await params;
  const data = await getSharedVehicleData(vehicleId);

  if (!data) {
    notFound();
  }

  const { vehicle, receipts } = data;
  const totalRepairs = receipts.reduce((sum, r) => sum + Number(r.total_amount || 0), 0);

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-4 py-8 antialiased">
      <div className="mx-auto max-w-xl">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl shadow-black/40">
          
          {/* 1. TOP HERO HEADER WITH PLATE NUMBER */}
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-6 py-8 text-white">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-emerald-400" />
                <span className="text-sm font-bold uppercase tracking-widest text-blue-200">
                  OtoRekod
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/40">
                <BadgeCheck className="h-3.5 w-3.5" />
                Verified History
              </span>
            </div>

            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200/80">
              Vehicle Health Passport
            </p>

            <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight capitalize text-white">
                  {vehicle.make} {vehicle.model}
                </h1>
                <p className="mt-0.5 text-sm text-blue-100/80">
                  Model year {vehicle.year} • {receipts.length} Milestones Logged
                </p>
              </div>

              {/* MALAYSIAN NUMBER PLATE BADGE */}
              {vehicle.plate_number && (
                <div className="inline-block self-start sm:self-center bg-[#090d16] border-2 border-slate-600 rounded-lg px-3.5 py-1.5 shadow-md">
                  <span className="font-mono font-black text-lg text-white tracking-widest uppercase">
                    {vehicle.plate_number}
                  </span>
                </div>
              )}
            </div>

            {/* STAT BAR: CURRENT ODOMETER & TOTAL VERIFIED */}
            <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-white/10 p-3.5 backdrop-blur-md border border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Gauge className="h-5 w-5 text-blue-200" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-blue-200/70">Odometer</p>
                  <p className="text-base font-bold text-white">
                    {vehicle.current_odometer.toLocaleString("en-MY")} km
                  </p>
                </div>
              </div>

              <div className="text-right flex flex-col justify-center pr-1 border-l border-white/10">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-blue-200/70">Total Logged</p>
                <p className="text-base font-bold text-emerald-400">
                  {formatCurrency(totalRepairs)}
                </p>
              </div>
            </div>
          </div>

          {/* 2. TIMELINE BODY (LATEST FIRST & CLEAN PARSED DETAILS) */}
          <div className="px-6 py-7">
            <div className="mb-6 flex items-center gap-2">
              <Car className="h-4 w-4 text-slate-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Chronological Service Timeline ({receipts.length} Records)
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
              <ol className="relative space-y-0 border-l-2 border-indigo-100 pl-6 ml-2">
                {receipts.map((receipt, index) => {
                  const { isJson, items } = parseLineItems(receipt.items_summary);

                  return (
                    <li key={receipt.id || `${receipt.service_date}-${index}`} className="relative pb-8 last:pb-0">
                      {/* Timeline Dot Indicator */}
                      <span className="absolute -left-[1.95rem] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 ring-4 ring-white shadow-sm" />
                      
                      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 shadow-sm">
                        
                        {/* Header: Date & Price */}
                        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200/60 pb-3">
                          <div>
                            <p className="font-bold text-slate-900 text-sm sm:text-base">
                              {formatDate(receipt.service_date)}
                            </p>
                            <p className="text-xs font-bold text-indigo-700 mt-0.5">
                              {receipt.workshop_name}
                            </p>
                          </div>
                          <p className="text-sm sm:text-base font-extrabold text-slate-900">
                            {formatCurrency(receipt.total_amount)}
                          </p>
                        </div>

                        {/* Workshop Authenticity Details */}
                        {(receipt.company_reg_no || receipt.workshop_address || receipt.workshop_phone) && (
                          <div className="mt-2.5 text-[11px] text-slate-500 space-y-1 bg-white p-2.5 rounded-xl border border-slate-100">
                            {receipt.company_reg_no && (
                              <p className="font-mono text-slate-600 font-semibold">
                                SSM / ROC: {receipt.company_reg_no}
                              </p>
                            )}
                            {receipt.workshop_address && (
                              <p className="flex items-start gap-1 text-slate-500">
                                <MapPin size={12} className="shrink-0 mt-0.5 text-slate-400" />
                                <span>{receipt.workshop_address}</span>
                              </p>
                            )}
                            {receipt.workshop_phone && (
                              <p className="flex items-center gap-1 text-slate-500">
                                <Phone size={12} className="text-slate-400" />
                                <span>{receipt.workshop_phone}</span>
                              </p>
                            )}
                          </div>
                        )}

                        {/* CLEAN ITEMIZED REPAIR DETAILS (NO RAW JSON) */}
                        <div className="mt-3 rounded-xl bg-white p-3 border border-slate-100">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                            Parts & Labor Done:
                          </p>

                          {isJson ? (
                            <div className="divide-y divide-slate-100 text-xs">
                              {items.map((item: any, idx: number) => (
                                <div key={idx} className="py-1.5 flex items-center justify-between gap-2">
                                  <span className="font-medium text-slate-700">{item.description}</span>
                                  <div className="text-right shrink-0 text-slate-900 font-semibold">
                                    {item.quantity > 1 && (
                                      <span className="text-[10px] text-slate-400 mr-1.5">x{item.quantity}</span>
                                    )}
                                    RM {Number(item.total || item.unit_price * (item.quantity || 1) || 0).toFixed(2)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <ul className="space-y-1 text-xs text-slate-700">
                              {items.map((item: any, idx: number) => (
                                <li key={idx} className="flex items-center gap-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                  <span>{item.description}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {/* Footer: Odometer + View Original Receipt Link */}
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/50">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200 shadow-sm">
                            <Gauge className="h-3 w-3 text-slate-400" />
                            {receipt.odometer > 0 ? `${receipt.odometer.toLocaleString("en-MY")} km` : "Mileage not logged"}
                          </span>

                          {receipt.image_url && (
                            <a
                              href={receipt.image_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg shadow-sm transition"
                            >
                              <FileText size={12} /> View Original Receipt <ExternalLink size={10} />
                            </a>
                          )}
                        </div>

                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* 3. FOOTER */}
          <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
            <p className="text-center text-xs leading-relaxed text-slate-500">
              Verified via <strong>OtoRekod</strong> — Tamper-resistant Malaysian vehicle registry.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Owner personal details are never shown on public shared passports.
        </p>
      </div>
    </div>
  );
}