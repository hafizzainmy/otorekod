import { NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured in environment variables." },
        { status: 500 }
      );
    }

    const payload = await request.json();
    let { file, mimeType } = payload;

    if (!file) {
      return NextResponse.json({ error: "Missing file parameter" }, { status: 400 });
    }

    // Strip data URI prefix if present
    if (file.includes(",")) {
      file = file.split(",")[1];
    }

    // Auto-detect PDF vs Image MIME types
    if (!mimeType || mimeType === "application/x-pdf" || mimeType === "binary/octet-stream") {
      mimeType = file.startsWith("JVBERi") ? "application/pdf" : "image/jpeg";
    }

    const promptText = `
      You are an expert Malaysian automotive workshop invoice parser.
      Analyze the attached vehicle repair receipt/invoice (image or PDF) and extract the metadata and individual line items.

      Return ONLY a strict JSON object with this exact schema (no markdown, no backticks):
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

    // Candidate models to try in order
    const modelsToTry = [
      "gemini-1.5-flash",
      "gemini-1.5-flash-latest",
      "gemini-2.0-flash-exp",
      "gemini-1.5-pro"
    ];

    let lastErrorDetails = "";
    let parsedData = null;

    for (const model of modelsToTry) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: promptText },
                    {
                      inline_data: {
                        mime_type: mimeType,
                        data: file,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                response_mime_type: "application/json",
              },
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          lastErrorDetails = data.error?.message || response.statusText;
          continue; // Try next model
        }

        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!candidateText) {
          lastErrorDetails = "Empty response from AI";
          continue;
        }

        const cleanJson = candidateText
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/```$/i, "")
          .trim();

        parsedData = JSON.parse(cleanJson);
        if (parsedData) break; // Successfully parsed!

      } catch (err: any) {
        lastErrorDetails = err.message;
      }
    }

    if (!parsedData) {
      return NextResponse.json(
        { error: `Google API Error: ${lastErrorDetails}` },
        { status: 500 }
      );
    }

    return NextResponse.json(parsedData);

  } catch (error: any) {
    console.error("AI Invoice Scan Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process document with AI" },
      { status: 500 }
    );
  }
}