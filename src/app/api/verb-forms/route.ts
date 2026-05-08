import { NextRequest, NextResponse } from "next/server";

interface VerbInput {
  word: string;
  meaning: string;
}

export interface VerbFormResult {
  word: string;
  meaning: string;
  v2: string;
  v3: string;
  type: "regular" | "irregular";
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { verbs } = body as { verbs?: VerbInput[] };

  if (
    !Array.isArray(verbs) ||
    verbs.length < 1 ||
    verbs.length > 20 ||
    verbs.some((v) => typeof v?.word !== "string" || v.word.trim() === "")
  ) {
    return NextResponse.json(
      { error: "verbs must be an array of 1–20 verb objects" },
      { status: 400 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Gemini API key not configured" },
      { status: 500 }
    );
  }

  const verbList = verbs.map((v, i) => `${i + 1}. ${v.word}`).join("\n");
  const prompt = `For each English verb below, provide its V2 (past simple) and V3 (past participle) forms, and whether it is regular or irregular.

Verbs:
${verbList}

Return ONLY a JSON array (no markdown, no explanation) in this exact format:
[
  { "word": "go", "v2": "went", "v3": "gone", "type": "irregular" },
  { "word": "walk", "v2": "walked", "v3": "walked", "type": "regular" }
]`;

  let geminiRes: Response;
  try {
    geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 800 },
        }),
      }
    );
  } catch {
    return NextResponse.json({ error: "Failed to reach Gemini API" }, { status: 502 });
  }

  if (geminiRes.status === 429) {
    return NextResponse.json({ error: "QUOTA_EXCEEDED" }, { status: 429 });
  }

  if (!geminiRes.ok) {
    return NextResponse.json({ error: "Gemini API returned an error" }, { status: 502 });
  }

  const data = (await geminiRes.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!raw) {
    return NextResponse.json({ error: "Empty response from Gemini" }, { status: 502 });
  }

  // Strip markdown code fences if present
  const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  let forms: { word: string; v2: string; v3: string; type: string }[];
  try {
    forms = JSON.parse(jsonStr);
  } catch {
    return NextResponse.json({ error: "Failed to parse Gemini response as JSON" }, { status: 502 });
  }

  // Merge meaning back in
  const wordMeaningMap = new Map(verbs.map((v) => [v.word.toLowerCase(), v.meaning]));
  const results: VerbFormResult[] = forms.map((f) => ({
    word: f.word,
    meaning: wordMeaningMap.get(f.word.toLowerCase()) ?? "",
    v2: f.v2,
    v3: f.v3,
    type: f.type === "irregular" ? "irregular" : "regular",
  }));

  return NextResponse.json({ results });
}
