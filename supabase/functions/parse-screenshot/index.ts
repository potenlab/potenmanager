import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

const SYSTEM_PROMPT = `You are a project data extractor. The user will send you a screenshot of a spreadsheet (Google Sheets, Excel, Notion table, etc.) containing project information.

Extract ALL projects visible in the screenshot and return them as a JSON array. For each project, extract whatever fields you can find:

{
  "name": "project name (required)",
  "description": "brief description if available",
  "status": "planning" | "active" | "paused" | "completed" (infer from context),
  "client": "client/company name if visible",
  "startDate": "YYYY-MM-DD if visible",
  "endDate": "YYYY-MM-DD if visible",
  "budget": "budget amount if visible",
  "category": "category if visible",
  "team": "team or responsible person if visible",
  "goal": "project goal if visible"
}

Rules:
- Return ONLY a valid JSON array, no markdown, no explanation
- If a field is not visible or unclear, omit it (don't guess)
- Translate Korean status words: 진행중/진행=active, 완료=completed, 기획/준비=planning, 중단/보류=paused
- Keep original project names exactly as shown (don't translate)
- If dates are in Korean format (e.g. 25.03.24), convert to YYYY-MM-DD (e.g. 2025-03-24)`;

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { imageBase64, mimeType = "image/png" } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 is required" }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: imageBase64,
                  },
                },
                {
                  text: "이 스크린샷에서 프로젝트 정보를 추출해줘.",
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return new Response(JSON.stringify({ error: `Gemini API error: ${err}` }), {
        status: 502,
        headers: CORS_HEADERS,
      });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    let projects;
    try {
      projects = JSON.parse(text);
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      projects = match ? JSON.parse(match[0]) : [];
    }

    return new Response(JSON.stringify({ projects }), {
      headers: CORS_HEADERS,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
});
