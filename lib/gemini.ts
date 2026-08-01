import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function parseReceiptWithAI(imageBuffer: Buffer, mimeType: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are an expert Malaysian automotive receipt parsing assistant.
      Analyze the attached image of a workshop invoice/receipt and return ONLY a valid JSON object.
      Do not include any markdown formatting, code blocks (such as \`\`\`json), or additional text.
      
      The JSON structure MUST match this exactly:
      {
        "service_date": "YYYY-MM-DD" (strictly in this format, or null if missing),
        "odometer": number (extract current mileage/KM as integer, or null if missing),
        "workshop_name": "string" (Name of the shop, or null if missing),
        "total_amount": number (extract total price paid in RM as a float, or null if missing),
        "items_summary": "string" (List 3-5 key parts replaced, e.g., "Engine oil, oil filter, spark plugs", or null if missing)
      }
      
      Translate and normalize terms commonly found in Malaysian receipts:
      - "Minyak hitam" or "Engine oil" -> Engine Oil
      - "Penapis minyak" or "Oil filter" -> Oil Filter
      - "Plag" or "Spark plug" -> Spark Plugs
      - "SST" or "Tax" should be calculated as part of the total.
    `;

    const imageParts = [
      {
        inlineData: {
          data: imageBuffer.toString("base64"),
          mimeType
        },
      },
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    const responseText = result.response.text().trim();
    
    // Clean JSON of any accidental markdown wrapper code blocks
    const cleanJson = responseText
      .replace(/^```json\s*/i, "")
      .replace(/```$/, "")
      .trim();

    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    return null;
  }
}