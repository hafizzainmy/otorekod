import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const SCAN_PROMPT = `You are parsing a Malaysian car service or repair receipt image.

Extract the following fields and return ONLY a valid JSON object with no markdown, no code fences, and no extra text.

Required JSON structure:
{
  "service_date": "YYYY-MM-DD" or null,
  "odometer": number or null,
  "workshop_name": "string" or null,
  "total_amount": number or null,
  "items_summary": "string listing key parts or services like Engine Oil, Brake Pads" or null
}

Rules:
- service_date must be ISO format YYYY-MM-DD if found
- odometer should be in kilometers as a number without units
- total_amount should be a number in Malaysian Ringgit (RM), without currency symbols
- items_summary should be a concise comma-separated list of key services or parts replaced
- Use null for any field that cannot be confidently determined from the receipt
- Return ONLY the JSON object`;

type ScanResult = {
  service_date: string | null;
  odometer: number | null;
  workshop_name: string | null;
  total_amount: number | null;
  items_summary: string | null;
};

function extractJson(text: string): ScanResult {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced ? fenced[1] : text).trim();
  const parsed = JSON.parse(raw) as ScanResult;

  return {
    service_date:
      typeof parsed.service_date === "string" ? parsed.service_date : null,
    odometer:
      typeof parsed.odometer === "number" && !Number.isNaN(parsed.odometer)
        ? parsed.odometer
        : null,
    workshop_name:
      typeof parsed.workshop_name === "string" ? parsed.workshop_name : null,
    total_amount:
      typeof parsed.total_amount === "number" &&
      !Number.isNaN(parsed.total_amount)
        ? parsed.total_amount
        : null,
    items_summary:
      typeof parsed.items_summary === "string" ? parsed.items_summary : null,
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Gemini API key is not configured." },
      { status: 500 }
    );
  }

  let body: { image?: string; mimeType?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { image, mimeType = "image/jpeg" } = body;

  if (!image || typeof image !== "string") {
    return NextResponse.json({ error: "No image provided." }, { status: 400 });
  }

  const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent([
      { text: SCAN_PROMPT },
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
    ]);

    const text = result.response.text();
    const data = extractJson(text);

    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to scan receipt.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
