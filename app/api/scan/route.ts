import { NextResponse } from "next/server";
import OpenAI from "openai";
// @ts-ignore
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured in environment variables." },
        { status: 500 }
      );
    }

    const payload = await request.json();
    let { file, mimeType } = payload;

    if (!file) {
      return NextResponse.json({ error: "Missing file payload" }, { status: 400 });
    }

    // Strip data URI header if present
    if (file.includes(",")) {
      file = file.split(",")[1];
    }

    const openai = new OpenAI({ apiKey });
    const isPdf = mimeType === "application/pdf" || file.startsWith("JVBERi");

    const promptInstructions = `
      You are an expert Malaysian automotive workshop invoice parser.
      Analyze the attached vehicle repair receipt/invoice and extract the metadata and individual line items.

      Translate common Malay terms to English (e.g. "Minyak Hitam" -> "Engine Oil", "Upah" -> "Labor").

      Return ONLY a JSON object with this exact schema:
      {
        "invoice_no": "string or empty string",
        "service_date": "YYYY-MM-DD or empty string",
        "odometer": 0,
        "workshop_name": "string",
        "line_items": [
          {
            "description": "string",
            "quantity": 1,
            "unit_price": 0.0,
            "total": 0.0
          }
        ]
      }
    `;

    let messages: any[] = [];

    // ROUTE 1: If it's a PDF document -> Extract Text
    if (isPdf) {
      try {
        const fileBuffer = Buffer.from(file, "base64");
        const pdfData = await pdfParse(fileBuffer);
        const extractedText = pdfData.text || "";

        messages = [
          {
            role: "user",
            content: `${promptInstructions}\n\nHere is the raw text extracted from the PDF invoice:\n"""\n${extractedText}\n"""`,
          },
        ];
      } catch (pdfErr) {
        console.error("PDF Parsing error:", pdfErr);
        return NextResponse.json(
          { error: "Could not extract text from this PDF. Please upload a clear photo/image instead." },
          { status: 400 }
        );
      }
    } 
    // ROUTE 2: If it's an Image (JPG, PNG, WEBP) -> Use OpenAI Vision
    else {
      const resolvedMime = mimeType && mimeType.startsWith("image/") ? mimeType : "image/jpeg";
      messages = [
        {
          role: "user",
          content: [
            { type: "text", text: promptInstructions },
            {
              type: "image_url",
              image_url: {
                url: `data:${resolvedMime};base64,${file}`,
                detail: "high",
              },
            },
          ],
        },
      ];
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.1,
      messages: messages,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "AI returned an empty response. Please try another clear document." },
        { status: 500 }
      );
    }

    const parsedData = JSON.parse(content);
    return NextResponse.json(parsedData);

  } catch (error: any) {
    console.error("OpenAI Scan API Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process receipt with OpenAI" },
      { status: 500 }
    );
  }
}