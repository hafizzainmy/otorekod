"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  FileText, 
  TrendingUp, 
  Wrench, 
  DollarSign, 
  Calendar 
} from "lucide-react";

interface Vehicle {
  id: string;
  plate_number: string;
  make: string;
  model: string;
  year: number;
  current_odometer: number;
}

interface Receipt {
  id: string;
  service_date: string;
  odometer: number;
  workshop_name: string;
  total_amount: number;
  items_summary: string;
  category?: string; // e.g., 'Service', 'Brakes', 'Major', 'Tyres'
}

export default function Dashboard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeVehicle, setActiveVehicle] = useState<Vehicle | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [expandedReceipts, setExpandedReceipts] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"timeline" | "analytics">("timeline");

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get vehicles
      const { data: dbVehicles } = await supabase
        .from("vehicles")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (dbVehicles && dbVehicles.length > 0) {
        setVehicles(dbVehicles);
        setActiveVehicle(dbVehicles[0]);

        // Get receipts
        const { data: dbReceipts } = await supabase
          .from("receipts")
          .select("*")
          .eq("vehicle_id", dbVehicles[0].id)
          .order("service_date", { ascending: false });

        if (dbReceipts) {
          // Dynamic category categorizer based on common keywords
          const categorized = dbReceipts.map((r) => {
            const itemsLower = (r.items_summary || "").toLowerCase();
            let category = "Service";
            if (itemsLower.includes("brek") || itemsLower.includes("brake") || itemsLower.includes("pad")) {
              category = "Brakes";
            } else if (itemsLower.includes("tayar") || itemsLower.includes("tyre") || itemsLower.includes("alignment")) {
              category = "Tyres";
            } else if (itemsLower.includes("enjin") || itemsLower.includes("gearbox") || itemsLower.includes("major")) {
              category = "Major";
            }
            return { ...r, category };
          });
          setReceipts(categorized);
        }
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleCopyLink = () => {
    if (!activeVehicle) return;
    const shareUrl = `${window.location.origin}/shared/${activeVehicle.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleExpand = (id: string) => {
    setExpandedReceipts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Summary Metrics calculation
  const totalSpent = receipts.reduce((sum, r) => sum + Number(r.total_amount), 0);
  const totalServices = receipts.length;
  const lastServiceDate = receipts[0] 
    ? new Date(receipts[0].service_date).toLocaleDateString("en-MY", { month: "short", year: "numeric" })
    : "No records";
  const lastWorkshop = receipts[0]?.workshop_name || "N/A";

  // Helper to parse "Oil Filter (RM25), Spark plug (RM50)" string into clean lines
  const parseItems = (summaryStr: string) => {
    if (!summaryStr) return [];
    return summaryStr.split(",").map(item => item.trim());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 antialiased">
      {/* 1. TOP HEADER */}
      <header className="border-b border-slate-200 bg-white px-4 py-4 md:px-8">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-lg">O</div>
            <span className="text-xl font-bold tracking-tight text-slate-900">OtoRekod</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Verified Record • Live
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        {activeVehicle ? (
          <div>
            {/* 2. TITLE & SHARE CARD */}
            <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Vehicle Passport • Read-Only</span>
                <h1 className="mt-1 text-3xl font-extrabold text-slate-900 md:text-4xl">
                  {activeVehicle.make} {activeVehicle.model} {activeVehicle.year ? `'${String(activeVehicle.year).slice(-2)}` : ""}
                </h1>
                
                {/* Malaysian Plate Styling */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="bg-[#1e293b] text-white font-mono px-3 py-1 rounded border-2 border-slate-600 font-bold tracking-wider shadow-sm text-sm">
                    {activeVehicle.plate_number.toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-slate-500">
                    {activeVehicle.year} • Verified History
                  </span>
                </div>
              </div>

              {/* Share Box */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm max-w-sm">
                <span className="text-xs font-semibold text-slate-400 block mb-2">Share this passport</span>
                <div className="flex items-center gap-2">
                  <div className="bg-slate-50 text-slate-500 text-xs px-3 py-2 rounded-lg border border-slate-200 truncate max-w-[200px]">
                    otorekod.my/v/{activeVehicle.id.slice(0,8)}
                  </div>
                  <button 
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 rounded-lg bg-[#0f172a] px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copied ? "Copied" : "Copy Link"}
                  </button>
                </div>
              </div>
            </div>

            {/* 3. FOUR METRIC CARDS */}
            <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              {/* Odometer */}
              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current Odometer</span>
                <div className="mt-2 text-2xl font-black text-slate-950">
                  {activeVehicle.current_odometer.toLocaleString()} <span className="text-sm font-normal text-slate-500">km</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Updated via last upload</span>
              </div>

              {/* Total Services */}
              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Services</span>
                <div className="mt-2 text-2xl font-black text-slate-950">{totalServices}</div>
                <span className="text-[10px] text-slate-400 mt-1 block">logged records</span>
              </div>

              {/* Total Spent */}
              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Spent</span>
                <div className="mt-2 text-2xl font-black text-emerald-600">
                  RM {totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">across all workshops</span>
              </div>

              {/* Last Service */}
              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Last Service</span>
                <div className="mt-2 text-lg font-bold text-slate-950 truncate">{lastServiceDate}</div>
                <span className="text-[10px] text-slate-400 mt-1 block truncate">{lastWorkshop}</span>
              </div>
            </div>

            {/* 4. NAVIGATION TABS */}
            <div className="mb-6 border-b border-slate-200">
              <nav className="flex gap-6">
                <button 
                  onClick={() => setActiveTab("timeline")}
                  className={`pb-3 text-sm font-bold border-b-2 transition ${
                    activeTab === "timeline" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Timeline
                </button>
                <button 
                  onClick={() => setActiveTab("analytics")}
                  className={`pb-3 text-sm font-bold border-b-2 transition ${
                    activeTab === "analytics" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Analytics
                </button>
              </nav>
            </div>

            {/* 5. TIMELINE BODY */}
            {activeTab === "timeline" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
                  <span>{receipts.length} records • most recent first</span>
                  {/* Category Legend */}
                  <div className="hidden md:flex items-center gap-3">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"></span>Service</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500"></span>Brakes</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500"></span>Major</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-purple-500"></span>Tyres</span>
                  </div>
                </div>

                {receipts.map((receipt) => {
                  const isExpanded = !!expandedReceipts[receipt.id];
                  const parsedItems = parseItems(receipt.items_summary);

                  // Set badge colors based on category
                  let categoryColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                  let dotColor = "bg-emerald-500";
                  if (receipt.category === "Brakes") {
                    categoryColor = "bg-amber-50 text-amber-700 border-amber-200";
                    dotColor = "bg-amber-500";
                  } else if (receipt.category === "Major") {
                    categoryColor = "bg-blue-50 text-blue-700 border-blue-200";
                    dotColor = "bg-blue-500";
                  } else if (receipt.category === "Tyres") {
                    categoryColor = "bg-purple-50 text-purple-700 border-purple-200";
                    dotColor = "bg-purple-500";
                  }

                  const dateObj = new Date(receipt.service_date);
                  const day = dateObj.getDate();
                  const month = dateObj.toLocaleDateString("en-MY", { month: "short" }).toUpperCase();
                  const year = dateObj.getFullYear();

                  return (
                    <div 
                      key={receipt.id} 
                      className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                    >
                      {/* Timeline Card Header (Clickable) */}
                      <div 
                        onClick={() => toggleExpand(receipt.id)}
                        className="flex cursor-pointer items-center justify-between p-5 select-none"
                      >
                        <div className="flex items-center gap-4">
                          {/* Left Date Indicator */}
                          <div className="flex flex-col items-center justify-center border-r border-slate-100 pr-4 text-center min-w-[50px]">
                            <span className="text-xl font-black text-slate-800 leading-none">{day}</span>
                            <span className="text-[10px] font-bold text-slate-400 mt-1">{month}</span>
                            <span className="text-[9px] text-slate-300 font-semibold">{year}</span>
                          </div>

                          {/* Middle Details */}
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Category Badge */}
                              <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${categoryColor} flex items-center gap-1`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`}></span>
                                {receipt.category}
                              </span>
                              <span className="text-xs font-semibold text-slate-400">
                                {receipt.odometer.toLocaleString()} km
                              </span>
                            </div>
                            <h4 className="mt-1 font-bold text-slate-800 text-sm md:text-base leading-snug group-hover:text-emerald-700 transition">
                              {receipt.workshop_name}
                            </h4>
                            <span className="text-xs text-slate-400 block mt-0.5">
                              {parsedItems.length} items parsed
                            </span>
                          </div>
                        </div>

                        {/* Right Price & Accordion Controls */}
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-extrabold text-slate-900">
                            RM {Number(receipt.total_amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                          <div className="text-slate-400">
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </div>
                        </div>
                      </div>

                      {/* Timeline Card Expanded Body */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-[#fafcfd] p-5">
                          <div className="max-w-2xl pl-12">
                            <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Itemized Parts & Labor Breakdown</h5>
                            <ul className="space-y-2.5">
                              {parsedItems.map((item, index) => {
                                // Match and parse items formatting: e.g. Spark Plug NGK (RM50)
                                const priceMatch = item.match(/\((RM\s*?\d+(\.\d{2})?)\)/i);
                                const itemNameOnly = priceMatch ? item.replace(priceMatch[0], "").trim() : item;
                                const itemPriceOnly = priceMatch ? priceMatch[1] : null;

                                return (
                                  <li key={index} className="flex items-center justify-between text-xs font-medium text-slate-600 border-b border-dashed border-slate-100 pb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                                      <span>{itemNameOnly}</span>
                                    </div>
                                    {itemPriceOnly && (
                                      <span className="font-bold text-slate-800">{itemPriceOnly}</span>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>

                            {/* Utility Buttons */}
                            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                              <span>Receipt #RCP-{receipt.id.slice(0,8).toUpperCase()}</span>
                              <button className="flex items-center gap-1 rounded bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 shadow-sm transition">
                                <FileText size={12} />
                                View Receipt
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ANALYTICS TAB CONTENT */
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                <TrendingUp size={36} className="mx-auto text-slate-300 mb-3" />
                <h4 className="font-bold text-slate-800 mb-1">Maintenance Expense Analytics</h4>
                <p className="text-sm text-slate-400 max-w-md mx-auto">This section uses historical local workshop data to plot cost analytics, showing whether you are spending below or above average relative to similar car models.</p>
              </div>
            )}
          </div>
        ) : (
          /* NO VEHICLE STATE */
          <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
            <Wrench size={36} className="mx-auto text-slate-300 mb-3" />
            <h4 className="font-bold text-slate-800 mb-1">No Vehicles Registered</h4>
            <p className="text-sm text-slate-400 mb-4">Please register a vehicle on your profile dashboard to begin tracking maintenance histories.</p>
          </div>
        )}
      </main>
    </div>
  );
}