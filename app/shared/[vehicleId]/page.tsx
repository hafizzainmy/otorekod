"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  ShieldCheck, 
  Car, 
  Calendar, 
  MapPin, 
  Phone, 
  FileText, 
  ExternalLink, 
  CheckCircle2, 
  X,
  Wrench
} from "lucide-react";

interface Vehicle {
  id: string;
  plate_number: string;
  make: string;
  model: string;
  year: number;
  current_odometer: number;
}

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Receipt {
  id: string;
  service_date: string;
  odometer: number;
  workshop_name: string;
  company_reg_no?: string;
  workshop_address?: string;
  workshop_phone?: string;
  total_amount: number;
  items_summary: string;
  invoice_no?: string;
  category?: string;
  image_url?: string;
}

export default function SharedPassportPage() {
  const params = useParams();
  const vehicleId = params?.id as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPublicPassport() {
      if (!vehicleId) return;

      // 1. Fetch Vehicle Information
      const { data: dbVehicle } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", vehicleId)
        .single();

      if (dbVehicle) {
        setVehicle(dbVehicle);

        // 2. Fetch Receipts sorted by latest date
        const { data: dbReceipts } = await supabase
          .from("receipts")
          .select("*")
          .eq("vehicle_id", vehicleId)
          .order("service_date", { ascending: false });

        if (dbReceipts) {
          setReceipts(dbReceipts);
        }
      }
      setLoading(false);
    }
    fetchPublicPassport();
  }, [vehicleId]);

  // Helper to parse line items JSON into readable items
  const parseLineItems = (summary: string): { isJson: boolean; items: any[] } => {
    if (!summary) return { isJson: false, items: [] };
    try {
      const parsed = JSON.parse(summary);
      if (Array.isArray(parsed)) return { isJson: true, items: parsed };
    } catch (e) {}
    return { isJson: false, items: summary.split(",").map(i => ({ description: i.trim() })) };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b132b] flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-[#0b132b] flex items-center justify-center p-4 text-center text-white">
        <div className="max-w-md bg-slate-900/80 p-8 rounded-2xl border border-slate-800">
          <Car size={48} className="mx-auto text-slate-500 mb-3" />
          <h2 className="text-xl font-bold">Vehicle Passport Not Found</h2>
          <p className="text-sm text-slate-400 mt-2">The link might be invalid or the record has been removed by the owner.</p>
        </div>
      </div>
    );
  }

  const totalSpent = receipts.reduce((sum, r) => sum + Number(r.total_amount || 0), 0);

  return (
    <div className="min-h-screen bg-[#f0f4f8] text-slate-800 antialiased pb-16">
      
      {/* 1. TOP HERO BLUE HEADER */}
      <header className="bg-gradient-to-b from-[#0b1b3d] to-[#132c5e] text-white px-5 pt-8 pb-14 shadow-lg">
        <div className="mx-auto max-w-3xl">
          
          {/* Brand & Verified Badge */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-emerald-400" size={22} />
              <span className="font-black text-lg tracking-tight">OTOREKOD</span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-bold text-emerald-300">
              <CheckCircle2 size={13} /> Verified History
            </span>
          </div>

          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">
            Official Vehicle Health Passport
          </span>

          {/* Vehicle Title & Malaysian Plate Number Badge */}
          <div className="mt-2 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black capitalize tracking-tight text-white">
                {vehicle.make} {vehicle.model}
              </h1>
              <p className="text-sm text-slate-300 mt-0.5">
                Model Year {vehicle.year} • {receipts.length} Documented Milestones
              </p>
            </div>

            {/* MALAYSIAN PLATE NUMBER BADGE */}
            <div className="inline-block bg-[#111827] border-2 border-slate-500 rounded-lg px-4 py-1.5 shadow-md">
              <span className="font-mono font-black text-xl text-white tracking-widest uppercase">
                {vehicle.plate_number}
              </span>
            </div>
          </div>

          {/* Current Mileage Stat Bar */}
          <div className="mt-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">Current Odometer</span>
              <span className="text-2xl font-black text-white">{vehicle.current_odometer.toLocaleString()} km</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">Verified Total Repairs</span>
              <span className="text-lg font-bold text-emerald-400">
                RM {totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

        </div>
      </header>

      {/* 2. MAIN TIMELINE BODY */}
      <main className="mx-auto max-w-3xl px-4 -mt-6">
        <div className="flex items-center gap-2 mb-4 text-xs font-extrabold uppercase tracking-wider text-slate-500">
          <Wrench size={14} /> Service & Maintenance Timeline
        </div>

        {receipts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-400">
            No service records published for this vehicle yet.
          </div>
        ) : (
          <div className="relative border-l-2 border-indigo-200 ml-4 space-y-6">
            {receipts.map((receipt) => {
              const { isJson, items } = parseLineItems(receipt.items_summary);
              const dateObj = new Date(receipt.service_date);
              const formattedDate = dateObj.toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" });

              return (
                <div key={receipt.id} className="relative pl-6">
                  {/* Timeline Dot Indicator */}
                  <div className="absolute -left-[9px] top-4 h-4 w-4 rounded-full border-2 border-white bg-indigo-600 shadow-sm" />

                  {/* Service Record Card */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                    
                    {/* Card Header: Date & Amount */}
                    <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
                      <div>
                        <span className="text-base font-extrabold text-slate-900">{formattedDate}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {receipt.odometer > 0 && (
                            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {receipt.odometer.toLocaleString()} km
                            </span>
                          )}
                          {receipt.invoice_no && (
                            <span className="text-[11px] text-slate-400">#{receipt.invoice_no}</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-lg font-black text-indigo-700">
                          RM {Number(receipt.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Workshop Info */}
                    <div className="mt-3">
                      <h4 className="font-bold text-slate-800 text-sm">{receipt.workshop_name}</h4>
                      {receipt.company_reg_no && (
                        <span className="text-[10px] text-slate-400 block font-mono">ROC/SSM: {receipt.company_reg_no}</span>
                      )}
                      {receipt.workshop_address && (
                        <p className="text-[11px] text-slate-500 flex items-start gap-1 mt-1">
                          <MapPin size={12} className="shrink-0 mt-0.5 text-slate-400" />
                          <span>{receipt.workshop_address}</span>
                        </p>
                      )}
                    </div>

                    {/* CLEAN PARSED REPAIR DETAILS (NOT RAW JSON) */}
                    <div className="mt-4 rounded-xl border border-slate-100 bg-[#f8fafc] p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                        Itemized Repairs & Spare Parts:
                      </span>

                      {isJson ? (
                        <div className="divide-y divide-slate-200/60 text-xs">
                          {items.map((item: InvoiceLineItem, idx: number) => (
                            <div key={idx} className="py-2 flex items-center justify-between">
                              <span className="font-medium text-slate-700">{item.description}</span>
                              <div className="text-right shrink-0 font-semibold text-slate-900 ml-3">
                                {item.quantity > 1 && <span className="text-[10px] text-slate-400 mr-2">x{item.quantity}</span>}
                                RM {Number(item.total || item.unit_price * (item.quantity || 1)).toFixed(2)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <ul className="space-y-1.5 text-xs text-slate-700">
                          {items.map((item: any, idx: number) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                              <span>{item.description}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* ORIGINAL INVOICE LINK BUTTON */}
                    {receipt.image_url && (
                      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                        <button
                          onClick={() => setPreviewImage(receipt.image_url || null)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/80 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-sm"
                        >
                          <FileText size={13} />
                          View Original Stamped Receipt
                        </button>
                      </div>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 3. IMAGE PREVIEW MODAL */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-4 max-w-2xl w-full flex flex-col max-h-[90vh] shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-emerald-600" />
                Verified Workshop Invoice Proof
              </h3>
              <button onClick={() => setPreviewImage(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-auto my-3 flex-1 flex justify-center bg-slate-50 rounded-xl p-2 border border-slate-100">
              <img src={previewImage} alt="Original Invoice Proof" className="max-w-full object-contain rounded-lg" />
            </div>
            <div className="pt-2 flex justify-end">
              <a 
                href={previewImage} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                Open High-Resolution in New Tab <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}