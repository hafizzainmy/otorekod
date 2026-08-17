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
    let { file } = payload;

    if (!file) {
      return NextResponse.json({ error: "Missing file payload" }, { status: 400 });
    }

    if (file.includes(",")) {
      file = file.split(",")[1];
    }

    const openai = new OpenAI({ apiKey });

    const prompt = `
You are an expert Malaysian automotive forensic auditor and workshop invoice parser.
Analyze this workshop receipt/invoice with extreme attention to detail and authenticity.

### EXTRACTION RULES:
1. **WORKSHOP DETAILS (AUTHENTICITY AUDIT)**:
   - "workshop_name": Official registered name of workshop/service center.
   - "company_reg_no": Company registration number / SSM / ROC No (e.g., "202101012345 (123456-X)" or "SSM: IP0512345-W"). Return empty string if not printed.
   - "workshop_address": Complete physical address including street, taman/area, postcode, city, and state.
   - "workshop_phone": Contact telephone/mobile/WhatsApp number.
   - "workshop_email": Email address if printed (else empty string).

2. **DATE OF SERVICE (TOP PRIORITY)**:
   - "service_date": Must be in "YYYY-MM-DD" format. Look for "Date", "Tarikh", "Inv Date", or machine timestamps.

3. **ODOMETER / MILEAGE**:
   - "odometer": Look for "Mileage", "Odometer", "KM", "Batu", "Perbatuan". Integer only (e.g. 85400). If not printed, return 0.
   - "is_scheduled_service": Boolean (true if the invoice contains scheduled maintenance items like Engine Oil, Oil Filter, Gear Oil/ATF, Spark Plugs, Coolant, Brake Fluid, Timing Belt).

4. **ITEM DESCRIPTIONS (NEVER USE BARE PART CODES)**:
   - If an invoice writes an OEM part number or abbreviation (e.g., "08880-83325" or "FLTR ASSY" or "BRK PAD FR"), DO NOT leave it cryptic. 
   - Expand the description to be human-readable while preserving the code, e.g.: "Engine Oil Toyota Genuine 5W-30 (08880-83325)" or "Front Brake Pad Set (Genuine OEM)".
   - Translate Malay workshop jargon into clear terms (e.g., "Minyak Hitam" -> "Engine Oil", "Tali Sawat" -> "Timing Belt / Fan Belt", "Minyak Gearbox" -> "Transmission Fluid / ATF", "Upah Pasang" -> "Labor Charge").

Return ONLY a strict JSON object with this exact schema:
{
  "invoice_no": "string",
  "service_date": "YYYY-MM-DD",
  "odometer": 0,
  "is_scheduled_service": false,
  "workshop_name": "string",
  "company_reg_no": "string",
  "workshop_address": "string",
  "workshop_phone": "string",
  "workshop_email": "string",
  "line_items": [
    {
      "description": "Full clear description of parts or labor",
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