import { NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured in Vercel environment variables." },
        { status: 500 }
      );
    }

    const payload = await request.json();
    let { file, mimeType } = payload;

    if (!file) {
      return NextResponse.json({ error: "Missing file payload" }, { status: 400 });
    }

    if (file.includes(",")) {
      file = file.split(",")[1];
    }

    const openai = new OpenAI({ apiKey });

    const prompt = `
      You are an expert Malaysian automotive workshop invoice parser.
      Analyze the attached vehicle repair receipt/invoice and extract the metadata and individual line items.

      Translate common Malay terms to English (e.g. "Minyak Hitam" -> "Engine Oil", "Upah" -> "Labor").

      Return ONLY a valid JSON object matching this schema:
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

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${file}`,
                detail: "high",
              },
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "AI returned an empty response." },
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