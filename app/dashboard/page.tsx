"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  FileText, 
  TrendingUp, 
  Wrench, 
  LogOut,
  Upload,
  Calendar,
  X,
  Plus,
  Trash2,
  Sparkles,
  Camera,
  FolderOpen
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
  total_amount: number;
  items_summary: string;
  invoice_no?: string;
  category?: string;
}

export default function Dashboard() {
  const supabase = createClient();
  const router = useRouter();
  
  // Refs for different upload methods
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeVehicle, setActiveVehicle] = useState<Vehicle | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [expandedReceipts, setExpandedReceipts] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"timeline" | "analytics">("timeline");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [scanning, setScanning] = useState(false);

  // Form states for receipt insertion
  const [newDate, setNewDate] = useState("");
  const [newOdometer, setNewOdometer] = useState("");
  const [newWorkshop, setNewWorkshop] = useState("");
  const [newInvoiceNo, setNewInvoiceNo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Dynamic Line Items State
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { description: "", quantity: 1, unit_price: 0, total: 0 }
  ]);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: dbVehicles } = await supabase
        .from("vehicles")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (dbVehicles && dbVehicles.length > 0) {
        setVehicles(dbVehicles);
        setActiveVehicle(dbVehicles[0]);

        const { data: dbReceipts } = await supabase
          .from("receipts")
          .select("*")
          .eq("vehicle_id", dbVehicles[0].id)
          .order("service_date", { ascending: false });

        if (dbReceipts) {
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
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

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

  // Helper to compress large smartphone photos directly in the browser
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        // Target high-definition resolution optimized for OCR
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        // Export as JPEG at 75% quality (shrinks 8MB down to ~200KB)
        const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
        const base64String = dataUrl.split(",")[1];
        resolve(base64String);
      };
      img.onerror = error => reject(error);
    });
  };

  // Convert File to Base64 (Standard fallback for PDF files)
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(",")[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Upgraded AI Invoice Scanner Execution
  const handleAIScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    try {
      let base64File = "";
      const mimeType = file.type;

      // Compress if it is an image, upload directly if it is a PDF
      if (mimeType.startsWith("image/")) {
        base64File = await compressImage(file);
      } else {
        base64File = await fileToBase64(file);
      }

      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: base64File, mimeType })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to scan file");

      // Auto-populate form fields
      if (data.invoice_no) setNewInvoiceNo(data.invoice_no);
      if (data.service_date) setNewDate(data.service_date);
      if (data.odometer) setNewOdometer(String(data.odometer));
      if (data.workshop_name) setNewWorkshop(data.workshop_name);
      
      if (data.line_items && data.line_items.length > 0) {
        setLineItems(data.line_items.map((item: any) => ({
          description: item.description || "",
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          total: (item.quantity || 1) * (item.unit_price || 0)
        })));
      }

      setShowUploadForm(true);

    } catch (err: any) {
      console.error("AI Error Debug details:", err);
      alert(`AI was unable to process the receipt: ${err.message || "Unknown error"}. Please try another photo or enter details manually.`);
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const handleLineItemChange = (index: number, field: keyof InvoiceLineItem, value: any) => {
    const updated = [...lineItems];
    const item = updated[index];

    if (field === "description") {
      item.description = value;
    } else if (field === "quantity") {
      item.quantity = Math.max(1, parseInt(value, 10) || 1);
      item.total = item.quantity * item.unit_price;
    } else if (field === "unit_price") {
      item.unit_price = Math.max(0, parseFloat(value) || 0);
      item.total = item.quantity * item.unit_price;
    }

    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const calculateTotalAmount = () => {
    return lineItems.reduce((sum, item) => sum + item.total, 0);
  };

  const handleAddReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVehicle || submitting) return;

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const totalCalculated = calculateTotalAmount();
    const serializedItems = JSON.stringify(lineItems);

    const { data: newRecord, error } = await supabase.from("receipts").insert({
      vehicle_id: activeVehicle.id,
      user_id: user.id,
      service_date: newDate,
      odometer: parseInt(newOdometer, 10) || 0,
      workshop_name: newWorkshop,
      invoice_no: newInvoiceNo,
      total_amount: totalCalculated,
      items_summary: serializedItems
    }).select().single();

    if (!error && newRecord) {
      if (parseInt(newOdometer, 10) > activeVehicle.current_odometer) {
        await supabase
          .from("vehicles")
          .update({ current_odometer: parseInt(newOdometer, 10) })
          .eq("id", activeVehicle.id);
        setActiveVehicle({ ...activeVehicle, current_odometer: parseInt(newOdometer, 10) });
      }

      setReceipts([{ ...newRecord, category: "Service" }, ...receipts]);
      
      // Reset State
      setNewDate("");
      setNewOdometer("");
      setNewWorkshop("");
      setNewInvoiceNo("");
      setLineItems([{ description: "", quantity: 1, unit_price: 0, total: 0 }]);
      setShowUploadForm(false);
    }
    setSubmitting(false);
  };

  const totalSpent = receipts.reduce((sum, r) => sum + Number(r.total_amount), 0);
  const totalServices = receipts.length;
  const lastServiceDate = receipts[0] 
    ? new Date(receipts[0].service_date).toLocaleDateString("en-MY", { month: "short", year: "numeric" })
    : "No records";
  const lastWorkshop = receipts[0]?.workshop_name || "N/A";

  const getParsedItems = (itemsSummary: string): { isJson: boolean; data: any[] } => {
    if (!itemsSummary) return { isJson: false, data: [] };
    try {
      const parsed = JSON.parse(itemsSummary);
      if (Array.isArray(parsed)) {
        return { isJson: true, data: parsed };
      }
    } catch (e) {}
    return { isJson: false, data: itemsSummary.split(",").map(item => item.trim()) };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] text-slate-800 antialiased">
      
      {/* 1. HIDDEN SYSTEM CONTROLS (FILE & NATIVE CAMERA INPUTS) */}
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleAIScan}
        accept="image/*,application/pdf"
        className="hidden"
      />

      <input 
        type="file"
        ref={cameraInputRef}
        onChange={handleAIScan}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* 2. NAVIGATION HEADER */}
      <header className="border-b border-slate-200 bg-white px-4 py-4 md:px-8 shadow-sm">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="h-8 w-8 text-sky-600 fill-current" viewBox="0 0 24 24">
              <path d="M23.5 13.5c0-.828-.672-1.5-1.5-1.5h-1.072l-1.36-3.393c-.34-.848-1.168-1.407-2.08-1.407H6.512c-.912 0-1.74.559-2.08 1.407l-1.36 3.393H2c-.828 0-1.5.672-1.5 1.5V17c0 .828.672 1.5 1.5 1.5h1.5c0 .828.672 1.5 1.5 1.5s1.5-.672 1.5-1.5h8c0 .828.672 1.5 1.5 1.5s1.5-.672 1.5-1.5h1.5c.828 0 1.5-.672 1.5-1.5v-3.5zM6.5 17c-.552 0-1-.448-1-1s.448-1 1-1 1 .448 1 1-.448 1-1 1zm11 0c-.552 0-1-.448-1-1s.448-1 1-1 1 .448 1 1-.448 1-1 1zM5.512 9h12.976l1.2 3H4.312l1.2-3z" />
            </svg>
            <span className="text-xl font-black tracking-tight text-slate-900">OtoRekod</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button 
              disabled={scanning}
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-2 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
              title="Take receipt photo"
            >
              <Camera size={14} />
              <span className="hidden sm:inline">Take Photo</span>
            </button>

            <button 
              disabled={scanning}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 text-xs font-bold text-indigo-700 transition disabled:opacity-50"
              title="Upload PDF or Image file"
            >
              <FolderOpen size={14} />
              <span className="hidden sm:inline">Upload File</span>
            </button>

            <button 
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-xs font-bold text-white shadow-sm transition"
              title="Enter invoice manually"
            >
              <Upload size={14} />
              <span className="hidden sm:inline">Manual</span>
            </button>

            <button 
              onClick={handleSignOut}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-600 shadow-sm transition"
              title="Sign out of OtoRekod"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* AI Processing Loading Overlay */}
      {scanning && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm text-white p-4">
          <div className="bg-slate-900 rounded-2xl p-6 border border-indigo-500/30 flex flex-col items-center shadow-2xl max-w-sm text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-400 mb-4"></div>
            <h3 className="font-extrabold text-base text-indigo-300 flex items-center gap-2">
              <Sparkles size={16} className="animate-pulse" />
              OtoRekod AI Parsing...
            </h3>
            <p className="text-xs text-slate-400 mt-2">Reading invoice details and structuring individual line items. This takes about 5 seconds.</p>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        
        {/* 3. DYNAMIC REVIEW & EDIT FORM */}
        {showUploadForm && activeVehicle && (
          <div className="mb-8 rounded-2xl border-2 border-indigo-200 bg-white p-6 shadow-lg animate-in slide-in-from-top duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-base">
                <Sparkles className="text-indigo-600" size={18} />
                Verify & Save Invoice Details
              </h3>
              <button onClick={() => setShowUploadForm(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddReceipt} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Invoice / Receipt No</label>
                  <input 
                    type="text" 
                    placeholder="e.g. INV-9921"
                    value={newInvoiceNo} 
                    onChange={e => setNewInvoiceNo(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-indigo-500 focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Service Date</label>
                  <input 
                    type="date" 
                    required 
                    value={newDate} 
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-indigo-500 focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Odometer (KM)</label>
                  <input 
                    type="number" 
                    required 
                    placeholder="Current Mileage"
                    value={newOdometer} 
                    onChange={e => setNewOdometer(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-indigo-500 focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Workshop Name</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Bengkel Wira Jaya"
                    value={newWorkshop} 
                    onChange={e => setNewWorkshop(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-indigo-500 focus:outline-none" 
                  />
                </div>
              </div>

              {/* Dynamic Line Items Section */}
              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Invoice Line Items</h4>
                
                <div className="space-y-3">
                  {lineItems.map((item, index) => (
                    <div key={index} className="flex flex-col md:flex-row items-center gap-3">
                      <div className="flex-grow w-full">
                        <input 
                          type="text" 
                          required
                          placeholder="Item description"
                          value={item.description}
                          onChange={e => handleLineItemChange(index, "description", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div className="w-full md:w-24">
                        <input 
                          type="number" 
                          required
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={e => handleLineItemChange(index, "quantity", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 p-2.5 text-sm text-center focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div className="w-full md:w-32">
                        <input 
                          type="number" 
                          step="0.01"
                          required
                          placeholder="Unit Price (RM)"
                          value={item.unit_price || ""}
                          onChange={e => handleLineItemChange(index, "unit_price", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 p-2.5 text-sm text-right focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div className="w-full md:w-32 text-right font-bold text-slate-700 px-2 text-sm">
                        RM {item.total.toFixed(2)}
                      </div>
                      {lineItems.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeLineItem(index)}
                          className="text-slate-400 hover:text-red-500 p-2 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button 
                  type="button" 
                  onClick={addLineItem}
                  className="mt-4 flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition"
                >
                  <Plus size={14} />
                  Add Line Item
                </button>
              </div>

              {/* Form Footer & Calculations */}
              <div className="border-t border-slate-100 pt-5 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/50 p-4 rounded-xl">
                <div className="text-sm">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-xs">Calculated Total: </span>
                  <span className="font-extrabold text-slate-800 text-lg ml-1">RM {calculateTotalAmount().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                  <button 
                    type="button" 
                    onClick={() => setShowUploadForm(false)}
                    className="w-full md:w-auto rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="w-full md:w-auto rounded-lg bg-emerald-600 hover:bg-emerald-700 px-6 py-2.5 text-sm font-bold text-white transition disabled:opacity-50 shadow-sm"
                  >
                    {submitting ? "Saving..." : "Save Invoice"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {activeVehicle ? (
          <div>
            {/* 4. TITLE & SHARE CARD */}
            <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Vehicle Passport • Read-Only</span>
                <h1 className="mt-1 text-3xl font-extrabold text-slate-900 md:text-4xl">
                  {activeVehicle.make} {activeVehicle.model} {activeVehicle.year ? `'${String(activeVehicle.year).slice(-2)}` : ""}
                </h1>
                
                <div className="mt-3 flex items-center gap-3">
                  <div className="bg-[#1e293b] text-white font-mono px-3 py-1 rounded border-2 border-slate-600 font-bold tracking-wider shadow-sm text-sm">
                    {activeVehicle.plate_number.toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-slate-500">
                    {activeVehicle.year} • Verified History
                  </span>
                </div>
              </div>

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

            {/* 5. FOUR STAT SUMMARY CARDS */}
            <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current Odometer</span>
                <div className="mt-2 text-2xl font-black text-slate-950">
                  {activeVehicle.current_odometer.toLocaleString()} <span className="text-sm font-normal text-slate-500">km</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Updated via last upload</span>
              </div>

              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Services</span>
                <div className="mt-2 text-2xl font-black text-slate-950">{totalServices}</div>
                <span className="text-[10px] text-slate-400 mt-1 block">logged records</span>
              </div>

              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Spent</span>
                <div className="mt-2 text-2xl font-black text-emerald-600">
                  RM {totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">across all workshops</span>
              </div>

              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Last Service</span>
                <div className="mt-2 text-lg font-bold text-slate-950 truncate">{lastServiceDate}</div>
                <span className="text-[10px] text-slate-400 mt-1 block truncate">{lastWorkshop}</span>
              </div>
            </div>

            {/* 6. NAVIGATION TABS */}
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

            {/* 7. TIMELINE BODY */}
            {activeTab === "timeline" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
                  <span>{receipts.length} records • most recent first</span>
                  <div className="hidden md:flex items-center gap-3">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"></span>Service</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500"></span>Brakes</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500"></span>Major</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-purple-500"></span>Tyres</span>
                  </div>
                </div>

                {receipts.map((receipt) => {
                  const isExpanded = !!expandedReceipts[receipt.id];
                  const parsed = getParsedItems(receipt.items_summary);

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
                      {/* Main Timeline Bar Accordion Trigger */}
                      <div 
                        onClick={() => toggleExpand(receipt.id)}
                        className="flex cursor-pointer items-center justify-between p-5 select-none"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center justify-center border-r border-slate-100 pr-4 text-center min-w-[50px]">
                            <span className="text-xl font-black text-slate-800 leading-none">{day}</span>
                            <span className="text-[10px] font-bold text-slate-400 mt-1">{month}</span>
                            <span className="text-[9px] text-slate-300 font-semibold">{year}</span>
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${categoryColor} flex items-center gap-1`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`}></span>
                                {receipt.category}
                              </span>
                              <span className="text-xs font-semibold text-slate-400">
                                {receipt.odometer.toLocaleString()} km
                              </span>
                              {receipt.invoice_no && (
                                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                  #{receipt.invoice_no}
                                </span>
                              )}
                            </div>
                            <h4 className="mt-1 font-bold text-slate-800 text-sm md:text-base leading-snug group-hover:text-emerald-700 transition">
                              {receipt.workshop_name}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="text-lg font-extrabold text-slate-900">
                            RM {Number(receipt.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <div className="text-slate-400">
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Section showing the itemized invoice table */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-[#fafcfd] p-5">
                          <div className="max-w-3xl md:pl-12">
                            <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Itemized Invoice Summary</h5>
                            
                            {parsed.isJson ? (
                              /* Structured Invoice View */
                              <div className="overflow-x-auto rounded-lg border border-slate-100 bg-white">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                                    <tr>
                                      <th className="px-4 py-2.5">Item Description</th>
                                      <th className="px-4 py-2.5 text-center w-16">Qty</th>
                                      <th className="px-4 py-2.5 text-right w-32">Unit (RM)</th>
                                      <th className="px-4 py-2.5 text-right w-32">Total (RM)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                                    {parsed.data.map((item: InvoiceLineItem, idx: number) => (
                                      <tr key={idx} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-2.5 font-semibold text-slate-700">{item.description}</td>
                                        <td className="px-4 py-2.5 text-center">{item.quantity}</td>
                                        <td className="px-4 py-2.5 text-right">{Number(item.unit_price).toFixed(2)}</td>
                                        <td className="px-4 py-2.5 text-right font-bold text-slate-700">{Number(item.total).toFixed(2)}</td>
                                      </tr>
                                    ))}
                                    {/* Subtotal row */}
                                    <tr className="bg-slate-50/50 font-bold">
                                      <td colSpan={3} className="px-4 py-3 text-right text-slate-500 uppercase tracking-wider text-[10px]">Total Amount</td>
                                      <td className="px-4 py-3 text-right text-slate-900 text-sm">RM {Number(receipt.total_amount).toFixed(2)}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              /* Legacy fallback list view */
                              <ul className="space-y-2.5 bg-white p-4 rounded-lg border border-slate-100">
                                {parsed.data.map((item: string, index: number) => (
                                  <li key={index} className="flex items-center gap-2 text-xs font-medium text-slate-600 border-b border-dashed border-slate-100 pb-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            )}

                            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                              <span>Receipt #RCP-{receipt.id.slice(0,8).toUpperCase()}</span>
                              <button className="flex items-center gap-1 rounded bg-white border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 shadow-sm transition">
                                <FileText size={12} />
                                View Original Invoice
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
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                <TrendingUp size={36} className="mx-auto text-slate-300 mb-3" />
                <h4 className="font-bold text-slate-800 mb-1">Maintenance Expense Analytics</h4>
                <p className="text-sm text-slate-400 max-w-md mx-auto">This section uses historical local workshop data to plot cost analytics, showing whether you are spending below or above average relative to similar car models.</p>
              </div>
            )}
          </div>
        ) : (
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