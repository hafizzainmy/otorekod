import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseReceiptWithAI } from "@/lib/gemini";

// Initialize admin Supabase client (bypasses RLS for automated services)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(request: Request) {
  try {
    // Twilio sends data as 'application/x-www-form-urlencoded' rather than JSON
    const formData = await request.formData();
    
    const rawFrom = formData.get("From") as string; // Format: "whatsapp:+60123456789"
    const mediaUrl = formData.get("MediaUrl0") as string; // Public URL of the attached receipt
    const numMedia = parseInt(formData.get("NumMedia") as string || "0", 10);
    const mediaType = formData.get("MediaContentType0") as string; // e.g. "image/jpeg"

    // 1. Validation check
    if (!rawFrom || numMedia === 0 || !mediaUrl) {
      return sendTwiMLResponse("Hi! Please send an image of your workshop receipt or invoice to log it on OtoRekod.");
    }

    // Extract the raw phone digits (e.g. "60123456789")
    const cleanPhoneNumber = rawFrom.replace("whatsapp:", "").replace("+", "").trim();
    const suffix = cleanPhoneNumber.slice(-9); // Grab last 9 digits for matching variations

    // 2. Identify the user profile by phone suffix
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .ilike("phone_number", `%${suffix}%`)
      .single();

    if (profileErr || !profile) {
      console.error("Profile matching error:", profileErr);
      return sendTwiMLResponse("OtoRekod couldn't find an account linked to this phone number. Please register and add your phone number on our website first!");
    }

    // 3. Find the user's active vehicle
    const { data: vehicle, error: vehicleErr } = await supabaseAdmin
      .from("vehicles")
      .select("id, make, model")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (vehicleErr || !vehicle) {
      return sendTwiMLResponse(`Hi ${profile.full_name}, we found your profile, but you haven't added a vehicle on OtoRekod yet. Please add a vehicle on the website first!`);
    }

    // 4. Download image from Twilio's public CDN
    const imageRes = await fetch(mediaUrl);
    const arrayBuffer = await imageRes.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // 5. Send to Google Gemini for processing
    const aiResult = await parseReceiptWithAI(imageBuffer, mediaType);
    if (!aiResult) {
      return sendTwiMLResponse("OtoRekod AI struggled to read this receipt. Please ensure the receipt is clear, well-lit, and try sending it again.");
    }

    // 6. Insert the record into Supabase receipts table
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
      console.error("Supabase insert error:", insertErr);
      return sendTwiMLResponse("We ran into an error saving your receipt to the database. Please try again shortly.");
    }

    // 7. Update vehicle odometer if the receipt's odometer is newer/higher
    if (aiResult.odometer) {
      await supabaseAdmin
        .from("vehicles")
        .update({ current_odometer: aiResult.odometer })
        .eq("id", vehicle.id)
        .gt("current_odometer", aiResult.odometer);
    }

    // 8. Return instant success message back via TwiML XML
    const confirmationMsg = `✅ Receipt Logged Successfully!\n\n🚗 Vehicle: ${vehicle.make} ${vehicle.model}\n🔧 Shop: ${aiResult.workshop_name || "N/A"}\n💰 Amount: RM ${aiResult.total_amount || "0.00"}\n📈 Odometer: ${aiResult.odometer || "N/A"} km\n📦 Items: ${aiResult.items_summary || "N/A"}\n\nView details: https://otorekod.vercel.app/dashboard`;
    
    return sendTwiMLResponse(confirmationMsg);

  } catch (error) {
    console.error("Twilio Webhook Error:", error);
    return sendTwiMLResponse("System error occurred. Please try again later.");
  }
}

// HELPER FUNCTION: Returns reply to Twilio in correct XML TwiML format
function sendTwiMLResponse(messageText: string) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <Response>
    <Message>${escapeXml(messageText)}</Message>
  </Response>`;

  return new Response(xml, {
    headers: { "Content-Type": "text/xml" },
    status: 200
  });
}

// Escapes XML special characters
function escapeXml(unsafe: string) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}