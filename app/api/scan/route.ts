import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Allow up to 60s for PDF OCR processing on Vercel
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured in Vercel environment variables." },
        { status: 500 }
      );
    }

    const payload = await request.json();
    let { file, mimeType } = payload;

    if (!file) {
      return NextResponse.json({ error: "Missing file parameter" }, { status: 400 });
    }

    // 1. Strip any "data:...;base64," prefix if present
    if (file.includes(",")) {
      file = file.split(",")[1];
    }

    // 2. Normalize and ensure correct mimeType for PDFs and images
    if (!mimeType || mimeType === "application/x-pdf" || mimeType === "binary/octet-stream") {
      mimeType = file.startsWith("JVBERi") ? "application/pdf" : "image/jpeg";
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Enforce strict JSON output from Gemini
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = `
      You are an expert Malaysian automotive workshop invoice parser.
      Analyze the attached vehicle repair receipt/invoice (image or PDF) and extract the metadata and individual line items.

      Extract and return ONLY a valid JSON object matching this schema:
      {
        "invoice_no": "string or empty string if not found",
        "service_date": "YYYY-MM-DD format (use current year if year is ambiguous, or empty string)",
        "odometer": 0,
        "workshop_name": "string (name of mechanic or workshop)",
        "line_items": [
          {
            "description": "string (translate common Malay part names, e.g. Minyak Hitam -> Engine Oil)",
            "quantity": 1,
            "unit_price": 0.0,
            "total": 0.0
          }
        ]
      }
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: file,
          mimeType: mimeType,
        },
      },
    ]);

    const responseText = result.response.text().trim();

    // Clean JSON wrappers in case model includes them
    const cleanJson = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const parsedData = JSON.parse(cleanJson);

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("AI Invoice Scan Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process document with AI" },
      { status: 500 }
    );
  }
}