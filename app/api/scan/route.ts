import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { file, mimeType } = payload; // Base64 file and its mimeType (image/png, application/pdf, etc)

    if (!file || !mimeType) {
      return NextResponse.json({ error: "Missing file or mimeType parameter" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are an elite automated accounting and invoice auditing assistant specialized in Malaysian workshop invoices.
      Analyze the attached vehicle repair receipt/invoice (image or PDF) and extract the metadata and individual line items.
      
      You MUST return strictly a valid JSON object matching this schema exactly. 
      Do not wrap it in markdown block quotes (do not include \`\`\`json) or write any extra text.

      JSON Schema:
      {
        "invoice_no": "string" (or null if missing),
        "service_date": "YYYY-MM-DD" (or null if missing),
        "odometer": number (integer mileage/KM, or null if missing),
        "workshop_name": "string" (Name of shop, or null if missing),
        "line_items": [
          {
            "description": "string" (Translate common Malay parts names to English, e.g. "Minyak hitam" to "Engine Oil"),
            "quantity": number (integer quantity),
            "unit_price": number (unit price in RM),
            "total": number (quantity * unit_price)
          }
        ]
      }
    `;

    const documentParts = [
      {
        inlineData: {
          data: file,
          mimeType
        },
      },
    ];

    const result = await model.generateContent([prompt, ...documentParts]);
    const responseText = result.response.text().trim();

    // Clean JSON wrappers from response
    const cleanJson = responseText
      .replace(/^```json\s*/i, "")
      .replace(/```$/, "")
      .trim();

    const parsedData = JSON.parse(cleanJson);
    return NextResponse.json(parsedData);

  } catch (error) {
    console.error("AI Invoice Scan Error:", error);
    return NextResponse.json({ error: "Failed to process document with AI" }, { status: 500 });
  }
}