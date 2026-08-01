import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseReceiptWithAI } from "@/lib/gemini";

// Initialize admin Supabase bypass client because webhook is an automated service
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "" // Requires the service role key for database actions
);

// 1. WEBHOOK HANDSHAKE (GET Method)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const VERIFY_TOKEN = "OTOREKOD_VERIFY_TOKEN";

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// 2. RECEIVE MESSAGE (POST Method)
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // Safety check for WhatsApp payload structure
    const entry = payload.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message || message.type !== "image") {
      // If not an image message, ignore to prevent endless event processing loops
      return NextResponse.json({ status: "ignored" });
    }

    const rawSenderNumber = message.from; // e.g., "60123456789"
    const imageId = message.image.id;
    const mimeType = message.image.mime_type;
    const phoneNumberId = value.metadata.phone_number_id;

    // Normalizing Malaysian phone numbers to match database variants (e.g. 0123456789, +60123456789)
    const suffix = rawSenderNumber.slice(-9); // Grab last 9 digits to prevent mismatching country-code styles

    // Look up profile by phone number suffix
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .ilike("phone_number", `%${suffix}%`)
      .single();

    if (profileErr || !profile) {
      console.error("Profile matching error:", profileErr);
      await sendWhatsAppTextMessage(phoneNumberId, rawSenderNumber, "OtoRekod couldn't find an account linked to this phone number. Please register on our website first!");
      return NextResponse.json({ error: "Profile not found" });
    }

    // Find active vehicle owned by this user
    const { data: vehicle, error: vehicleErr } = await supabaseAdmin
      .from("vehicles")
      .select("id, make, model")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (vehicleErr || !vehicle) {
      await sendWhatsAppTextMessage(phoneNumberId, rawSenderNumber, `Hi ${profile.full_name}, we found your account but you haven't registered a vehicle on OtoRekod yet. Please add a vehicle first!`);
      return NextResponse.json({ error: "Vehicle not found" });
    }

    // Download image from Meta API
    const imageBuffer = await downloadMetaMedia(imageId);
    if (!imageBuffer) {
      await sendWhatsAppTextMessage(phoneNumberId, rawSenderNumber, "Sorry, we failed to process your receipt image. Please try sending it again.");
      return NextResponse.json({ error: "Media download failed" });
    }

    // Process image with Gemini
    const aiResult = await parseReceiptWithAI(imageBuffer, mimeType);
    if (!aiResult) {
      await sendWhatsAppTextMessage(phoneNumberId, rawSenderNumber, "OtoRekod AI struggled to extract information from this image. Please ensure the receipt is readable.");
      return NextResponse.json({ error: "AI Parsing failed" });
    }

    // Insert the parsed data into Supabase
    const { error: insertErr } = await supabaseAdmin.from("receipts").insert({
      vehicle_id: vehicle.id,
      user_id: profile.id,
      service_date: aiResult.service_date || new Date().toISOString().split("T")[0],
      odometer: aiResult.odometer || 0,
      workshop_name: aiResult.workshop_name || "Unknown Workshop",
      total_amount: aiResult.total_amount || 0,
      items_summary: aiResult.items_summary || ""
    });

    if (insertErr) {
      console.error("Database insert error:", insertErr);
      return NextResponse.json({ error: "Failed to write database record" });
    }

    // Update vehicle's current odometer if the receipt's odometer is higher
    if (aiResult.odometer) {
      await supabaseAdmin
        .from("vehicles")
        .update({ current_odometer: aiResult.odometer })
        .eq("id", vehicle.id)
        .gt("current_odometer", aiResult.odometer); // update only if newer reading is higher
    }

    // Send successful confirmation response
    const confirmationMsg = `✅ Receipt Logged Successfully!\n\n🚗 Vehicle: ${vehicle.make} ${vehicle.model}\n🔧 Shop: ${aiResult.workshop_name || "N/A"}\n💰 Amount: RM ${aiResult.total_amount || "0.00"}\n📈 Odometer: ${aiResult.odometer || "N/A"} km\n📦 Items: ${aiResult.items_summary || "N/A"}\n\nView details: https://otorekod.vercel.app/dashboard`;
    await sendWhatsAppTextMessage(phoneNumberId, rawSenderNumber, confirmationMsg);

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("Global Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// HELPER FUNCTION: Download raw media from Meta API
async function downloadMetaMedia(mediaId: string): Promise<Buffer | null> {
  try {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    
    // 1. Query Meta for the media URL
    const metaRes = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const metaData = await metaRes.json();
    const mediaUrl = metaData.url;

    if (!mediaUrl) return null;

    // 2. Download raw binary data
    const mediaRes = await fetch(mediaUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const arrayBuffer = await mediaRes.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (e) {
    console.error("Download Meta Media Error:", e);
    return null;
  }
}

// HELPER FUNCTION: Send dynamic text replies via WhatsApp
async function sendWhatsAppTextMessage(phoneNumberId: string, to: string, text: string) {
  try {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: { body: text }
      })
    });
  } catch (e) {
    console.error("Failed to transmit WhatsApp reply:", e);
  }
}