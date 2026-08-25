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
  FolderOpen,
  ShieldCheck,
  Phone,
  MapPin,
  AlertCircle,
  Car,
  ExternalLink,
  AlertTriangle
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
  workshop_email?: string;
  total_amount: number;
  items_summary: string;
  invoice_no?: string;
  category?: string;
  image_url?: string;
}

interface ServiceForecast {
  serviceType: string;
  targetOdometer: number;
  targetDate: string;
  kmRemaining: number;
  daysRemaining: number;
  status: "healthy" | "due_soon" | "overdue";
  recommendation: string;
}

interface TCOAnalytics {
  costPerKm: number;
  totalDrivenKm: number;
  avgBillPerVisit: number;
  estimatedAnnualCost: number;
  categoryBreakdown: {
    category: string;
    amount: number;
    percentage: number;
    color: string;
  }[];
  benchmarkComparison: {
    status: "below" | "average" | "above";
    percentageDiff: number;
    text: string;
  };
}

export default function Dashboard() {
  const supabase = createClient();
  const router = useRouter();
  
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

  // Original Invoice Image state for upload & preview
  const [uploadedBase64, setUploadedBase64] = useState<string>("");
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Garage Modal State
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [newPlate, setNewPlate] = useState("");
  const [newMake, setNewMake] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newInitialOdometer, setNewInitialOdometer] = useState("");
  const [savingVehicle, setSavingVehicle] = useState(false);

  // Form states for receipt insertion
  const [newDate, setNewDate] = useState("");
  const [newOdometer, setNewOdometer] = useState("");
  const [newWorkshop, setNewWorkshop] = useState("");
  const [newCompanyRegNo, setNewCompanyRegNo] = useState("");
  const [newWorkshopAddress, setNewWorkshopAddress] = useState("");
  const [newWorkshopPhone, setNewWorkshopPhone] = useState("");
  const [newWorkshopEmail, setNewWorkshopEmail] = useState("");
  const [newInvoiceNo, setNewInvoiceNo] = useState("");
  const [isScheduledService, setIsScheduledService] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Dynamic Line Items State
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { description: "", quantity: 1, unit_price: 0, total: 0 }
  ]);

  // Load Vehicles on Initial Mount
  useEffect(() => {
    async function fetchInitialData() {
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
        await loadReceiptsForVehicle(dbVehicles[0].id);
      }
      setLoading(false);
    }
    fetchInitialData();
  }, [router]);

  // Load receipts when active vehicle changes
  const loadReceiptsForVehicle = async (vehicleId: string) => {
    const { data: dbReceipts } = await supabase
      .from("receipts")
      .select("*")
      .eq("vehicle_id", vehicleId)
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
    } else {
      setReceipts([]);
    }
  };

  const handleSwitchVehicle = async (vehicle: Vehicle) => {
    setActiveVehicle(vehicle);
    await loadReceiptsForVehicle(vehicle.id);
  };

  // Add New Vehicle Handler
  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingVehicle) return;

    setSavingVehicle(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: createdVehicle, error } = await supabase.from("vehicles").insert({
      user_id: user.id,
      plate_number: newPlate.toUpperCase().trim(),
      make: newMake.trim(),
      model: newModel.trim(),
      year: Number(newYear) || new Date().getFullYear(),
      current_odometer: parseInt(newInitialOdometer, 10) || 0
    }).select().single();

    if (!error && createdVehicle) {
      const updatedVehicles = [createdVehicle, ...vehicles];
      setVehicles(updatedVehicles);
      setActiveVehicle(createdVehicle);
      setReceipts([]);
      setShowAddVehicleModal(false);
      
      // Reset form
      setNewPlate("");
      setNewMake("");
      setNewModel("");
      setNewInitialOdometer("");
    } else {
      alert(error?.message || "Failed to register vehicle.");
    }
    setSavingVehicle(false);
  };

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

  // 1. SMART NEXT SERVICE DUE PREDICTOR
  const calculateNextService = (
    vehicle: Vehicle | null, 
    receiptsList: Receipt[]
  ): ServiceForecast | null => {
    if (!vehicle || receiptsList.length === 0) return null;

    const latestRecord = receiptsList.find(r => r.odometer > 0) || receiptsList[0];
    if (!latestRecord) return null;

    const currentOdo = vehicle.current_odometer || latestRecord.odometer || 0;
    const lastOdo = latestRecord.odometer || currentOdo;
    const lastDate = new Date(latestRecord.service_date);

    const summaryLower = (latestRecord.items_summary || "").toLowerCase();
    
    let intervalKm = 10000;
    let intervalMonths = 6;
    let serviceType = "Next Engine Oil & Filter Service";
    let recommendation = "Recommended: Fully Synthetic 0W-20 / 5W-30 + OEM Oil Filter";

    if (summaryLower.includes("gearbox") || summaryLower.includes("atf") || summaryLower.includes("cvt") || summaryLower.includes("transmission")) {
      intervalKm = 20000;
      intervalMonths = 12;
      serviceType = "Transmission / Gear Oil Interval";
      recommendation = "Recommended: Genuine Manufacturer CVT / ATF Fluid";
    } else if (summaryLower.includes("brek") || summaryLower.includes("brake")) {
      intervalKm = 25000;
      intervalMonths = 18;
      serviceType = "Brake System & Fluid Inspection";
      recommendation = "Inspect front/rear brake pads thickness and DOT4 fluid";
    } else if (summaryLower.includes("tayar") || summaryLower.includes("tyre") || summaryLower.includes("alignment")) {
      intervalKm = 10000;
      intervalMonths = 6;
      serviceType = "Tyre Rotation & Alignment Check";
      recommendation = "Rotate tyres and balance to prevent uneven tread wear";
    }

    const targetOdometer = lastOdo + intervalKm;
    const targetDateObj = new Date(lastDate);
    targetDateObj.setMonth(targetDateObj.getMonth() + intervalMonths);

    const today = new Date();
    const kmRemaining = targetOdometer - currentOdo;
    const diffTime = targetDateObj.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let status: "healthy" | "due_soon" | "overdue" = "healthy";
    if (kmRemaining <= 0 || daysRemaining <= 0) {
      status = "overdue";
    } else if (kmRemaining <= 1500 || daysRemaining <= 30) {
      status = "due_soon";
    }

    return {
      serviceType,
      targetOdometer,
      targetDate: targetDateObj.toLocaleDateString("en-MY", { month: "short", year: "numeric", day: "numeric" }),
      kmRemaining,
      daysRemaining,
      status,
      recommendation
    };
  };

  // 2. MALAYSIAN COST PER KM & TCO ANALYTICS
  const calculateTCO = (vehicle: Vehicle | null, receiptsList: Receipt[]): TCOAnalytics | null => {
    if (!vehicle || receiptsList.length === 0) return null;

    const totalSpent = receiptsList.reduce((sum, r) => sum + Number(r.total_amount || 0), 0);
    const odometers = receiptsList.map(r => r.odometer).filter(o => o > 0);
    const minOdo = odometers.length > 0 ? Math.min(...odometers) : 0;
    const maxOdo = vehicle.current_odometer || (odometers.length > 0 ? Math.max(...odometers) : 1);
    const totalDrivenKm = Math.max(1, maxOdo - (minOdo > 0 ? minOdo : 0));

    const costPerKm = totalSpent / (maxOdo > 0 ? maxOdo : 1);
    const avgBillPerVisit = totalSpent / receiptsList.length;

    const oldestDate = new Date(receiptsList[receiptsList.length - 1].service_date);
    const newestDate = new Date(receiptsList[0].service_date);
    const monthsTracked = Math.max(1, (newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24 * 30.4));
    const estimatedAnnualCost = (totalSpent / monthsTracked) * 12;

    let serviceSum = 0;
    let brakesSum = 0;
    let tyresSum = 0;
    let majorSum = 0;

    receiptsList.forEach(r => {
      const amt = Number(r.total_amount || 0);
      const cat = r.category || "Service";
      if (cat === "Brakes") brakesSum += amt;
      else if (cat === "Tyres") tyresSum += amt;
      else if (cat === "Major") majorSum += amt;
      else serviceSum += amt;
    });

    const categoryBreakdown = [
      {
        category: "Engine & Fluids",
        amount: serviceSum,
        percentage: totalSpent > 0 ? Math.round((serviceSum / totalSpent) * 100) : 0,
        color: "bg-emerald-500",
      },
      {
        category: "Braking System",
        amount: brakesSum,
        percentage: totalSpent > 0 ? Math.round((brakesSum / totalSpent) * 100) : 0,
        color: "bg-amber-500",
      },
      {
        category: "Tyres & Alignment",
        amount: tyresSum,
        percentage: totalSpent > 0 ? Math.round((tyresSum / totalSpent) * 100) : 0,
        color: "bg-purple-500",
      },
      {
        category: "Major & Transmission",
        amount: majorSum,
        percentage: totalSpent > 0 ? Math.round((majorSum / totalSpent) * 100) : 0,
        color: "bg-blue-500",
      },
    ];

    const MY_BENCHMARK_CPK = 0.045;
    const diff = ((costPerKm - MY_BENCHMARK_CPK) / MY_BENCHMARK_CPK) * 100;
    
    let benchmarkComparison: TCOAnalytics["benchmarkComparison"];
    if (diff < -5) {
      benchmarkComparison = {
        status: "below",
        percentageDiff: Math.abs(Math.round(diff)),
        text: `${Math.abs(Math.round(diff))}% Below Malaysian Average (Cost-Efficient)`
      };
    } else if (diff > 15) {
      benchmarkComparison = {
        status: "above",
        percentageDiff: Math.round(diff),
        text: `${Math.round(diff)}% Above National Average (Heavy Maintenance)`
      };
    } else {
      benchmarkComparison = {
        status: "average",
        percentageDiff: 0,
        text: "Within Standard Malaysian Vehicle Maintenance Average"
      };
    }

    return {
      costPerKm,
      totalDrivenKm,
      avgBillPerVisit,
      estimatedAnnualCost,
      categoryBreakdown,
      benchmarkComparison
    };
  };

  // Helper to compress standard camera photos
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
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

        const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
        resolve(dataUrl.split(",")[1]);
      };
      img.onerror = error => reject(error);
    });
  };

  // Helper to convert PDF to Image on browser
  const convertPdfToImage = async (file: File): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        if (!(window as any).pdfjsLib) {
          await new Promise((res, rej) => {
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            script.onload = () => {
              (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
                "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
              res(true);
            };
            script.onerror = rej;
            document.body.appendChild(script);
          });
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await (window as any).pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);

        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        resolve(dataUrl.split(",")[1]);
      } catch (err) {
        reject(err);
      }
    });
  };

  // Helper to upload base64 image to Supabase Storage
  const uploadToSupabaseStorage = async (base64String: string, vehicleId: string): Promise<string | null> => {
    try {
      const byteCharacters = atob(base64String);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/jpeg" });

      const fileName = `${vehicleId}/${Date.now()}_invoice.jpg`;
      const { data, error } = await supabase.storage
        .from("receipts-bucket")
        .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });

      if (error || !data) {
        console.warn("Storage upload warning:", error);
        return null;
      }

      const { data: publicUrlData } = supabase.storage
        .from("receipts-bucket")
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;
    } catch (e) {
      console.error("Storage helper error:", e);
      return null;
    }
  };

  // Main AI Scanner
  const handleAIScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    try {
      let base64File = "";

      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        base64File = await convertPdfToImage(file);
      } else {
        base64File = await compressImage(file);
      }

      setUploadedBase64(base64File);

      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: base64File, mimeType: "image/jpeg" })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to scan file");

      // DUPLICATE PRE-CHECK (CHECK 1: Strict Check on scanned invoice)
      if (data.invoice_no && data.service_date && activeVehicle) {
        const isDuplicate = receipts.some(r => 
          r.invoice_no?.toLowerCase().trim() === data.invoice_no.toLowerCase().trim() &&
          r.service_date === data.service_date
        );
        if (isDuplicate) {
          alert(`⚠️ DUPLICATE DETECTED: Invoice #${data.invoice_no} dated ${data.service_date} is already saved for this vehicle. This upload will be canceled.`);
          setScanning(false);
          return;
        }
      }

      if (data.invoice_no) setNewInvoiceNo(data.invoice_no);
      if (data.service_date) setNewDate(data.service_date);
      if (data.odometer) setNewOdometer(String(data.odometer));
      if (data.workshop_name) setNewWorkshop(data.workshop_name);
      if (data.company_reg_no) setNewCompanyRegNo(data.company_reg_no);
      if (data.workshop_address) setNewWorkshopAddress(data.workshop_address);
      if (data.workshop_phone) setNewWorkshopPhone(data.workshop_phone);
      if (data.workshop_email) setNewWorkshopEmail(data.workshop_email);
      if (data.is_scheduled_service !== undefined) setIsScheduledService(data.is_scheduled_service);
      
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
      console.error("AI Error:", err);
      alert(`AI was unable to process the receipt: ${err.message || "Unknown error"}. Please enter details manually.`);
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

  // Add Receipt & Store in Supabase
  const handleAddReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVehicle || submitting) return;

    if (!newDate) {
      alert("Please specify the Service Date (Top Priority).");
      return;
    }

    // DUPLICATE CHECK 1: Strict Check
    if (newInvoiceNo.trim()) {
      const isExactDuplicate = receipts.some(r => 
        r.invoice_no?.toLowerCase().trim() === newInvoiceNo.toLowerCase().trim() &&
        r.service_date === newDate
      );
      if (isExactDuplicate) {
        alert(`❌ REJECTED: Invoice #${newInvoiceNo} on ${newDate} is already recorded in your passport.`);
        return;
      }
    }

    // DUPLICATE CHECK 2: Fuzzy Warning (When Invoice No is blank)
    const totalCalculated = calculateTotalAmount();
    const isFuzzyDuplicate = receipts.some(r => 
      r.service_date === newDate &&
      Math.abs(Number(r.total_amount) - totalCalculated) < 1.0 &&
      r.workshop_name.toLowerCase().trim() === newWorkshop.toLowerCase().trim()
    );

    if (isFuzzyDuplicate) {
      const confirmProceed = confirm(
        `⚠️ WARNING: A receipt for RM ${totalCalculated.toFixed(2)} at ${newWorkshop} on ${newDate} already exists. Do you still want to save this duplicate?`
      );
      if (!confirmProceed) return;
    }

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Upload original image to Supabase Storage if present
    let storedImageUrl = "";
    if (uploadedBase64) {
      const publicUrl = await uploadToSupabaseStorage(uploadedBase64, activeVehicle.id);
      if (publicUrl) storedImageUrl = publicUrl;
    }

    const serializedItems = JSON.stringify(lineItems);
    const parsedOdo = parseInt(newOdometer, 10) || 0;

    const { data: newRecord, error } = await supabase.from("receipts").insert({
      vehicle_id: activeVehicle.id,
      user_id: user.id,
      service_date: newDate,
      odometer: parsedOdo,
      workshop_name: newWorkshop,
      company_reg_no: newCompanyRegNo,
      workshop_address: newWorkshopAddress,
      workshop_phone: newWorkshopPhone,
      workshop_email: newWorkshopEmail,
      invoice_no: newInvoiceNo,
      total_amount: totalCalculated,
      items_summary: serializedItems,
      image_url: storedImageUrl || null
    }).select().single();

    if (!error && newRecord) {
      if (parsedOdo > activeVehicle.current_odometer) {
        await supabase
          .from("vehicles")
          .update({ current_odometer: parsedOdo })
          .eq("id", activeVehicle.id);
        setActiveVehicle({ ...activeVehicle, current_odometer: parsedOdo });
      }

      const updatedList = [{ ...newRecord, category: "Service" }, ...receipts].sort(
        (a, b) => new Date(b.service_date).getTime() - new Date(a.service_date).getTime()
      );
      setReceipts(updatedList);
      
      // Reset State
      setNewDate("");
      setNewOdometer("");
      setNewWorkshop("");
      setNewCompanyRegNo("");
      setNewWorkshopAddress("");
      setNewWorkshopPhone("");
      setNewWorkshopEmail("");
      setNewInvoiceNo("");
      setUploadedBase64("");
      setLineItems([{ description: "", quantity: 1, unit_price: 0, total: 0 }]);
      setShowUploadForm(false);
    } else {
      alert(error?.message || "Failed to save invoice.");
    }
    setSubmitting(false);
  };

  const totalSpent = receipts.reduce((sum, r) => sum + Number(r.total_amount), 0);
  const totalServices = receipts.length;
  const lastServiceDate = receipts[0] 
    ? new Date(receipts[0].service_date).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })
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
      
      {/* 1. HIDDEN SYSTEM CONTROLS */}
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

      {/* 2. NAVIGATION HEADER WITH GARAGE SELECTOR */}
      <header className="border-b border-slate-200 bg-white px-4 py-3 md:px-8 shadow-sm">
        <div className="mx-auto max-w-5xl flex flex-wrap items-center justify-between gap-3">
          
          {/* Logo & Garage Switcher */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <svg className="h-7 w-7 text-sky-600 fill-current" viewBox="0 0 24 24">
                <path d="M23.5 13.5c0-.828-.672-1.5-1.5-1.5h-1.072l-1.36-3.393c-.34-.848-1.168-1.407-2.08-1.407H6.512c-.912 0-1.74.559-2.08 1.407l-1.36 3.393H2c-.828 0-1.5.672-1.5 1.5V17c0 .828.672 1.5 1.5 1.5h1.5c0 .828.672 1.5 1.5 1.5s1.5-.672 1.5-1.5h8c0 .828.672 1.5 1.5 1.5s1.5-.672 1.5-1.5h1.5c.828 0 1.5-.672 1.5-1.5v-3.5zM6.5 17c-.552 0-1-.448-1-1s.448-1 1-1 1 .448 1 1-.448 1-1 1zm11 0c-.552 0-1-.448-1-1s.448-1 1-1 1 .448 1 1-.448 1-1 1zM5.512 9h12.976l1.2 3H4.312l1.2-3z" />
              </svg>
              <span className="text-lg font-black tracking-tight text-slate-900 hidden sm:inline">OtoRekod</span>
            </div>

            {/* Garage Dropdown Selector */}
            {activeVehicle && (
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <select
                  value={activeVehicle.id}
                  onChange={(e) => {
                    const selected = vehicles.find(v => v.id === e.target.value);
                    if (selected) handleSwitchVehicle(selected);
                  }}
                  className="bg-transparent text-xs font-black text-slate-800 pr-2 pl-2 py-1 focus:outline-none cursor-pointer"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      🚗 {v.plate_number} ({v.make} {v.model})
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setShowAddVehicleModal(true)}
                  className="rounded-lg bg-indigo-600 text-white p-1 hover:bg-indigo-700 transition"
                  title="Add another vehicle to your garage"
                >
                  <Plus size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button 
              disabled={scanning}
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-2 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
            >
              <Camera size={14} />
              <span className="hidden sm:inline">Photo</span>
            </button>

            <button 
              disabled={scanning}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 text-xs font-bold text-indigo-700 transition disabled:opacity-50"
            >
              <FolderOpen size={14} />
              <span className="hidden sm:inline">Upload PDF</span>
            </button>

            <button 
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-xs font-bold text-white shadow-sm transition"
            >
              <Upload size={14} />
              <span className="hidden sm:inline">Manual</span>
            </button>

            <button 
              onClick={handleSignOut}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-600 shadow-sm transition"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* 3. ADD NEW VEHICLE MODAL */}
      {showAddVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-extrabold text-slate-900 flex items-center gap-2 text-base">
                <Car className="text-indigo-600" size={18} />
                Add Vehicle to Garage
              </h3>
              <button onClick={() => setShowAddVehicleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddVehicle} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Plate Number *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. VEE 8899"
                  value={newPlate}
                  onChange={e => setNewPlate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-sm uppercase font-mono font-bold focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Make (Brand) *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Perodua / Honda"
                    value={newMake}
                    onChange={e => setNewMake(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Model *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Myvi / City"
                    value={newModel}
                    onChange={e => setNewModel(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Manufacturing Year</label>
                  <input 
                    type="number" 
                    value={newYear}
                    onChange={e => setNewYear(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Current Odometer (KM)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 45000"
                    value={newInitialOdometer}
                    onChange={e => setNewInitialOdometer(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddVehicleModal(false)}
                  className="w-1/2 rounded-lg border border-slate-200 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingVehicle}
                  className="w-1/2 rounded-lg bg-indigo-600 hover:bg-indigo-700 py-2.5 text-xs font-bold text-white shadow-sm"
                >
                  {savingVehicle ? "Registering..." : "Add Vehicle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. ORIGINAL INVOICE IMAGE PREVIEW MODAL */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-4 max-w-2xl w-full flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <FileText size={16} className="text-indigo-600" />
                Original Verified Workshop Invoice
              </h3>
              <button onClick={() => setPreviewImageUrl(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-auto my-3 flex-1 flex justify-center bg-slate-50 rounded-xl p-2 border border-slate-100">
              <img src={previewImageUrl} alt="Original Invoice" className="max-w-full object-contain rounded-lg" />
            </div>
            <div className="pt-2 flex justify-end">
              <a 
                href={previewImageUrl} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                Open in Full Window <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* AI Processing Overlay */}
      {scanning && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm text-white p-4">
          <div className="bg-slate-900 rounded-2xl p-6 border border-indigo-500/30 flex flex-col items-center shadow-2xl max-w-sm text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-400 mb-4"></div>
            <h3 className="font-extrabold text-base text-indigo-300 flex items-center gap-2">
              <Sparkles size={16} className="animate-pulse" />
              OtoRekod AI Auditing...
            </h3>
            <p className="text-xs text-slate-400 mt-2">Extracting workshop authenticity (SSM, Phone, Address), service date, checking duplicate records, and expanding parts.</p>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        
        {/* 5. DYNAMIC REVIEW & EDIT FORM */}
        {showUploadForm && activeVehicle && (
          <div className="mb-8 rounded-2xl border-2 border-indigo-200 bg-white p-6 shadow-lg animate-in slide-in-from-top duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-base">
                  <ShieldCheck className="text-emerald-600" size={18} />
                  Verify Invoice & Workshop Authenticity
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Please review the details extracted by AI before saving to your Passport.</p>
              </div>
              <button onClick={() => setShowUploadForm(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X size={18} />
              </button>
            </div>

            {/* Mileage Alert if Scheduled Service detected */}
            {isScheduledService && (!newOdometer || newOdometer === "0") && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-800">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Scheduled Maintenance Detected:</span> Please provide the odometer reading if available. Recording mileage for fluid services maximizes your vehicle's resale passport value.
                </div>
              </div>
            )}

            <form onSubmit={handleAddReceipt} className="space-y-6">
              {/* PRIMARY METADATA */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Service Date <span className="text-red-500">* (Top Priority)</span>
                  </label>
                  <input 
                    type="date" 
                    required 
                    value={newDate} 
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full rounded-lg border-2 border-indigo-200 bg-indigo-50/30 p-2.5 text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Odometer (KM) {isScheduledService && <span className="text-amber-600 font-bold">(Recommended)</span>}
                  </label>
                  <input 
                    type="number" 
                    placeholder="e.g. 75000"
                    value={newOdometer} 
                    onChange={e => setNewOdometer(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-indigo-500 focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Invoice / Receipt No</label>
                  <input 
                    type="text" 
                    placeholder="e.g. INV-2026-99"
                    value={newInvoiceNo} 
                    onChange={e => setNewInvoiceNo(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-indigo-500 focus:outline-none" 
                  />
                </div>
              </div>

              {/* WORKSHOP AUTHENTICITY SECTION */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-slate-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Workshop Authenticity Details</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Workshop / Bengkel Name</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. Perodua Service Centre Glenmarie"
                      value={newWorkshop} 
                      onChange={e => setNewWorkshop(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm focus:border-indigo-500 focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Company Registration No (SSM / ROC)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 201901032145 (1341475-M)"
                      value={newCompanyRegNo} 
                      onChange={e => setNewCompanyRegNo(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm focus:border-indigo-500 focus:outline-none" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Full Workshop Address</label>
                    <input 
                      type="text" 
                      placeholder="e.g. No. 12, Jalan Utarid U5/14, Seksyen U5, 40150 Shah Alam, Selangor"
                      value={newWorkshopAddress} 
                      onChange={e => setNewWorkshopAddress(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm focus:border-indigo-500 focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Phone / WhatsApp</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 03-7845 1234 / 012-3456789"
                      value={newWorkshopPhone} 
                      onChange={e => setNewWorkshopPhone(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm focus:border-indigo-500 focus:outline-none" 
                    />
                  </div>
                </div>
              </div>

              {/* DYNAMIC LINE ITEMS */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Itemized Parts & Labor Summary</h4>
                  <span className="text-[11px] text-slate-400">AI expands cryptic OEM codes into full part names</span>
                </div>
                
                <div className="space-y-3">
                  {lineItems.map((item, index) => (
                    <div key={index} className="flex flex-col md:flex-row items-center gap-3">
                      <div className="flex-grow w-full">
                        <input 
                          type="text" 
                          required
                          placeholder="Detailed description (e.g. Fully Synthetic 5W-40 Engine Oil)"
                          value={item.description}
                          onChange={e => handleLineItemChange(index, "description", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div className="w-full md:w-20">
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
                          placeholder="Unit (RM)"
                          value={item.unit_price || ""}
                          onChange={e => handleLineItemChange(index, "unit_price", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 p-2.5 text-sm text-right focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div className="w-full md:w-32 text-right font-bold text-slate-800 px-2 text-sm">
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
                  Add Another Line Item
                </button>
              </div>

              {/* FORM FOOTER */}
              <div className="border-t border-slate-100 pt-5 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/50 p-4 rounded-xl">
                <div className="text-sm">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-xs">Total Amount: </span>
                  <span className="font-extrabold text-slate-800 text-lg ml-1">
                    RM {calculateTotalAmount().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
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
                    {submitting ? "Saving to Passport..." : "Save Verified Invoice"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {activeVehicle ? (
          <div>
            {/* 6. TITLE & SHARE CARD */}
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
                    {activeVehicle.year} • Chronological Verified Records
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

            {/* 7. NEXT SERVICE FORECAST CARD */}
            {(() => {
              const forecast = calculateNextService(activeVehicle, receipts);
              if (!forecast) return null;

              const isOverdue = forecast.status === "overdue";
              const isDueSoon = forecast.status === "due_soon";

              const cardBg = isOverdue 
                ? "bg-gradient-to-r from-red-50 to-rose-50 border-red-200" 
                : isDueSoon 
                ? "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200" 
                : "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200";

              const badgeBg = isOverdue 
                ? "bg-red-600 text-white" 
                : isDueSoon 
                ? "bg-amber-600 text-white" 
                : "bg-emerald-600 text-white";

              return (
                <div className={`mb-8 rounded-2xl border-2 p-6 shadow-sm ${cardBg} transition`}>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${badgeBg}`}>
                          {isOverdue ? "Service Overdue" : isDueSoon ? "Service Due Soon" : "On Track"}
                        </span>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Smart Maintenance Predictor
                        </span>
                      </div>

                      <h3 className="mt-2 text-xl font-black text-slate-900">
                        {forecast.serviceType}
                      </h3>

                      <p className="mt-1 text-xs text-slate-600 font-medium">
                        {forecast.recommendation}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-slate-200/60 shadow-sm shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Due At Mileage</span>
                        <span className="text-lg font-black text-slate-900">{forecast.targetOdometer.toLocaleString()} km</span>
                        <span className="text-[11px] text-slate-500 block">
                          {isOverdue ? (
                            <span className="font-bold text-red-600">Past target mileage</span>
                          ) : (
                            <span>{forecast.kmRemaining.toLocaleString()} km remaining</span>
                          )}
                        </span>
                      </div>

                      <div className="h-10 w-[1px] bg-slate-200"></div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Due By Date</span>
                        <span className="text-lg font-black text-slate-900">{forecast.targetDate}</span>
                        <span className="text-[11px] text-slate-500 block">
                          {isOverdue ? (
                            <span className="font-bold text-red-600">Overdue by {Math.abs(forecast.daysRemaining)} days</span>
                          ) : (
                            <span>In approx. {forecast.daysRemaining} days</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 8. STAT SUMMARY CARDS */}
            <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current Odometer</span>
                <div className="mt-2 text-2xl font-black text-slate-950">
                  {activeVehicle.current_odometer.toLocaleString()} <span className="text-sm font-normal text-slate-500">km</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Updated via latest service</span>
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
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Latest Record</span>
                <div className="mt-2 text-sm font-bold text-slate-950 truncate">{lastServiceDate}</div>
                <span className="text-[10px] text-slate-400 mt-1 block truncate">{lastWorkshop}</span>
              </div>
            </div>

            {/* 9. NAVIGATION TABS */}
            <div className="mb-6 border-b border-slate-200">
              <nav className="flex gap-6">
                <button 
                  onClick={() => setActiveTab("timeline")}
                  className={`pb-3 text-sm font-bold border-b-2 transition ${
                    activeTab === "timeline" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Chronological Timeline (Latest First)
                </button>
                <button 
                  onClick={() => setActiveTab("analytics")}
                  className={`pb-3 text-sm font-bold border-b-2 transition ${
                    activeTab === "analytics" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Malaysian TCO & Cost-per-KM Analytics
                </button>
              </nav>
            </div>

            {/* 10. MAIN CONTENT TABS */}
            {activeTab === "timeline" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
                  <span>{receipts.length} verified records • sorted by newest service date</span>
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
                      <div 
                        onClick={() => toggleExpand(receipt.id)}
                        className="flex cursor-pointer items-center justify-between p-5 select-none"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center justify-center border-r border-slate-100 pr-4 text-center min-w-[55px]">
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

                              {receipt.odometer > 0 ? (
                                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                  {receipt.odometer.toLocaleString()} km
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">
                                  Mileage not logged
                                </span>
                              )}

                              {receipt.invoice_no && (
                                <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
                                  #{receipt.invoice_no}
                                </span>
                              )}

                              {receipt.image_url && (
                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <FileText size={10} /> Verified Copy
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

                      {/* Expanded Section */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-[#fafcfd] p-5">
                          <div className="max-w-3xl md:pl-12 space-y-4">
                            
                            {/* Workshop Authenticity Card */}
                            {(receipt.company_reg_no || receipt.workshop_address || receipt.workshop_phone) && (
                              <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs space-y-1.5">
                                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                  <ShieldCheck size={14} className="text-emerald-600" />
                                  <span>Workshop Profile & Verification</span>
                                  {receipt.company_reg_no && (
                                    <span className="ml-1 text-[10px] font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                      ROC: {receipt.company_reg_no}
                                    </span>
                                  )}
                                </div>
                                {receipt.workshop_address && (
                                  <div className="flex items-start gap-1.5 text-slate-500 text-[11px]">
                                    <MapPin size={12} className="shrink-0 mt-0.5 text-slate-400" />
                                    <span>{receipt.workshop_address}</span>
                                  </div>
                                )}
                                {receipt.workshop_phone && (
                                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                                    <Phone size={12} className="text-slate-400" />
                                    <span>{receipt.workshop_phone}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Line Items Table */}
                            <div>
                              <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Itemized Summary</h5>
                              {parsed.isJson ? (
                                <div className="overflow-x-auto rounded-lg border border-slate-100 bg-white">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                                      <tr>
                                        <th className="px-4 py-2.5">Item Description</th>
                                        <th className="px-4 py-2.5 text-center w-16">Qty</th>
                                        <th className="px-4 py-2.5 text-right w-28">Unit (RM)</th>
                                        <th className="px-4 py-2.5 text-right w-28">Total (RM)</th>
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
                                      <tr className="bg-slate-50/50 font-bold">
                                        <td colSpan={3} className="px-4 py-2.5 text-right text-slate-500 uppercase tracking-wider text-[10px]">Total Amount</td>
                                        <td className="px-4 py-2.5 text-right text-slate-900 text-sm">RM {Number(receipt.total_amount).toFixed(2)}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <ul className="space-y-2 bg-white p-3 rounded-lg border border-slate-100">
                                  {parsed.data.map((item: string, index: number) => (
                                    <li key={index} className="flex items-center gap-2 text-xs font-medium text-slate-600 border-b border-dashed border-slate-100 pb-1.5">
                                      <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            {/* View Original Copy Button */}
                            {receipt.image_url && (
                              <div className="pt-2 flex justify-end">
                                <button
                                  onClick={() => setPreviewImageUrl(receipt.image_url || null)}
                                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg transition"
                                >
                                  <FileText size={14} /> View Original Stamped Invoice
                                </button>
                              </div>
                            )}

                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* TAB 2: ANALYTICS */
              (() => {
                const tco = calculateTCO(activeVehicle, receipts);
                if (!tco) {
                  return (
                    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                      <TrendingUp size={36} className="mx-auto text-slate-300 mb-3" />
                      <h4 className="font-bold text-slate-800 mb-1">Not Enough Data for Analytics</h4>
                      <p className="text-sm text-slate-400 max-w-md mx-auto">Upload at least one verified workshop invoice to calculate your vehicle's cost per kilometer.</p>
                    </div>
                  );
                }

                const isBelowAvg = tco.benchmarkComparison.status === "below";
                const isAboveAvg = tco.benchmarkComparison.status === "above";

                return (
                  <div className="space-y-6">
                    <div className="rounded-2xl border-2 border-slate-200/80 bg-white p-6 shadow-sm">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                            Running Efficiency • Malaysian TCO Benchmark
                          </span>
                          <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-4xl font-black text-slate-900">
                              RM {tco.costPerKm.toFixed(3)}
                            </span>
                            <span className="text-sm font-bold text-slate-500">/ kilometer</span>
                          </div>
                          
                          <div className="mt-3 flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                              isBelowAvg 
                                ? "bg-emerald-100 text-emerald-800" 
                                : isAboveAvg 
                                ? "bg-rose-100 text-rose-800" 
                                : "bg-slate-100 text-slate-700"
                            }`}>
                              {tco.benchmarkComparison.text}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 md:w-80">
                          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Avg Bill / Visit</span>
                            <span className="text-base font-extrabold text-slate-800 mt-1 block">
                              RM {tco.avgBillPerVisit.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400">per invoice</span>
                          </div>

                          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Est. Annual Cost</span>
                            <span className="text-base font-extrabold text-emerald-600 mt-1 block">
                              RM {tco.estimatedAnnualCost.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400">/ 12 months</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-slate-800 text-sm md:text-base">
                          Maintenance Expense Distribution
                        </h4>
                        <span className="text-xs text-slate-400">Total Spent: RM {totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>

                      <div className="h-4 w-full rounded-full bg-slate-100 flex overflow-hidden gap-0.5 mb-6">
                        {tco.categoryBreakdown.map((cat, idx) => (
                          cat.percentage > 0 && (
                            <div 
                              key={idx} 
                              style={{ width: `${cat.percentage}%` }} 
                              className={`${cat.color} transition-all duration-500`}
                              title={`${cat.category}: ${cat.percentage}%`}
                            />
                          )
                        ))}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {tco.categoryBreakdown.map((cat, idx) => (
                          <div key={idx} className="rounded-xl border border-slate-100 bg-[#fafcfd] p-4">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-600">{cat.category}</span>
                              <span className="text-xs font-black text-slate-900">{cat.percentage}%</span>
                            </div>
                            <div className="mt-2 text-lg font-black text-slate-800">
                              RM {cat.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="mt-2 flex items-center gap-1.5">
                              <span className={`h-2 w-2 rounded-full ${cat.color}`}></span>
                              <span className="text-[10px] text-slate-400">of total repairs</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-900 text-white p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                            Resale Value Protector
                          </span>
                          <span className="text-xs text-slate-400">OtoRekod Passport Certificate</span>
                        </div>
                        <h4 className="mt-1 text-base font-bold text-white">
                          Your vehicle has {receipts.length} verified maintenance milestones.
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-xl">
                          Cars with documented service histories command a <strong>RM 2,000 – RM 5,000 premium</strong> on Malaysian second-hand marketplaces compared to unverified units.
                        </p>
                      </div>

                      <button 
                        onClick={handleCopyLink}
                        className="w-full md:w-auto shrink-0 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-5 py-3 text-xs font-bold text-slate-950 transition shadow-sm"
                      >
                        {copied ? "Link Copied!" : "Share Verified Passport"}
                      </button>
                    </div>

                  </div>
                );
              })()
            )}
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
            <Wrench size={36} className="mx-auto text-slate-300 mb-3" />
            <h4 className="font-bold text-slate-800 mb-1">No Vehicles in Garage</h4>
            <p className="text-sm text-slate-400 mb-4">Click below to add your first vehicle to OtoRekod.</p>
            <button 
              onClick={() => setShowAddVehicleModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition"
            >
              <Plus size={14} /> Add First Vehicle
            </button>
          </div>
        )}
      </main>
    </div>
  );
}