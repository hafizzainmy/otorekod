import { NextResponse } from "next/server";
import { parseReceiptWithAI } from "@/lib/gemini";
import { createServiceClient } from "@/lib/supabase/service";

const VERIFY_TOKEN = "OTOREKOD_VERIFY_TOKEN";
const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://otorekod.vercel.app";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

type ParsedReceipt = {
  service_date?: string | null;
  odometer?: number | null;
  workshop_name?: string | null;
  total_amount?: number | null;
  items_summary?: string | null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const message = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message || message.type !== "image") {
      return NextResponse.json({ status: "ignored" });
    }

    const value = payload.entry[0].changes[0].value;
    const rawSenderNumber = message.from as string;
    const imageId = message.image.id as string;
    const mimeType = (message.image.mime_type as string) || "image/jpeg";
    const phoneNumberId = value.metadata.phone_number_id as string;

    const suffix = rawSenderNumber.slice(-9);
    const supabase = createServiceClient();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .ilike("phone_number", `%${suffix}%`)
      .single();

    if (profileError || !profile) {
      await sendWhatsAppTextMessage(
        phoneNumberId,
        rawSenderNumber,
        "OtoRekod couldn't find an account linked to this phone number. Please register on our website and add your WhatsApp number to your profile first."
      );
      return NextResponse.json({ status: "profile_not_found" });
    }

    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id, make, model, current_odometer")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (vehicleError || !vehicle) {
      await sendWhatsAppTextMessage(
        phoneNumberId,
        rawSenderNumber,
        "We found your OtoRekod account, but you haven't added a vehicle yet. Please add a vehicle on the website first."
      );
      return NextResponse.json({ status: "vehicle_not_found" });
    }

    const imageBuffer = await downloadMetaMedia(imageId);
    if (!imageBuffer) {
      await sendWhatsAppTextMessage(
        phoneNumberId,
        rawSenderNumber,
        "Sorry, we couldn't download your receipt image. Please try sending it again."
      );
      return NextResponse.json({ error: "media_download_failed" }, { status: 500 });
    }

    const aiResult = (await parseReceiptWithAI(
      imageBuffer,
      mimeType
    )) as ParsedReceipt | null;

    if (!aiResult) {
      await sendWhatsAppTextMessage(
        phoneNumberId,
        rawSenderNumber,
        "OtoRekod AI couldn't read this receipt. Please send a clear, well-lit photo and try again."
      );
      return NextResponse.json({ error: "ai_parse_failed" }, { status: 500 });
    }

    const odometer = aiResult.odometer ?? vehicle.current_odometer ?? 0;
    const totalAmount = aiResult.total_amount ?? 0;

    const { error: insertError } = await supabase.from("receipts").insert({
      vehicle_id: vehicle.id,
      user_id: profile.id,
      service_date:
        aiResult.service_date ?? new Date().toISOString().split("T")[0],
      odometer,
      workshop_name: aiResult.workshop_name ?? "Unknown Workshop",
      total_amount: totalAmount,
      items_summary: aiResult.items_summary ?? "",
    });

    if (insertError) {
      console.error("Receipt insert error:", insertError);
      await sendWhatsAppTextMessage(
        phoneNumberId,
        rawSenderNumber,
        "We couldn't save your receipt. Please try again in a moment."
      );
      return NextResponse.json({ error: "insert_failed" }, { status: 500 });
    }

    if (odometer > (vehicle.current_odometer ?? 0)) {
      await supabase
        .from("vehicles")
        .update({ current_odometer: odometer })
        .eq("id", vehicle.id);
    }

    const passportUrl = `${APP_BASE_URL}/shared/${vehicle.id}`;
    const confirmationMsg = `RM ${totalAmount.toFixed(2)} logged for your ${vehicle.model}! View your updated passport here: ${passportUrl}`;

    await sendWhatsAppTextMessage(
      phoneNumberId,
      rawSenderNumber,
      confirmationMsg
    );

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function downloadMetaMedia(mediaId: string): Promise<Buffer | null> {
  try {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!token) {
      console.error("WHATSAPP_ACCESS_TOKEN is not configured.");
      return null;
    }

    const metaResponse = await fetch(
      `https://graph.facebook.com/v21.0/${mediaId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const metaData = (await metaResponse.json()) as { url?: string };
    if (!metaData.url) {
      return null;
    }

    const mediaResponse = await fetch(metaData.url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!mediaResponse.ok) {
      return null;
    }

    const arrayBuffer = await mediaResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("Meta media download error:", error);
    return null;
  }
}

async function sendWhatsAppTextMessage(
  phoneNumberId: string,
  to: string,
  text: string
) {
  try {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!token) {
      console.error("WHATSAPP_ACCESS_TOKEN is not configured.");
      return;
    }

    await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { body: text },
      }),
    });
  } catch (error) {
    console.error("WhatsApp reply error:", error);
  }
}
