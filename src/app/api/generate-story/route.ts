import { NextRequest, NextResponse } from "next/server";

interface WordInput {
  word: string;
  meaning: string;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { words } = body as { words?: WordInput[] };

  if (
    !Array.isArray(words) ||
    words.length < 1 ||
    words.length > 10 ||
    words.some((w) => typeof w?.word !== "string" || w.word.trim() === "")
  ) {
    return NextResponse.json({ error: "words must be an array of 1–10 word objects" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Gemini API key not configured. Please set GEMINI_API_KEY in .env.local" },
      { status: 500 }
    );
  }

  const prompt = `You are an English teacher writing short stories for Thai learners.\n\nWrite a short story (5–7 sentences) in simple English. You MUST use every single one of the following words at least once. Do NOT skip any word:\n${words.map((w, i) => `${i + 1}. ${w.word} (${w.meaning})`).join("\n")}\n\nRules:\n- Every word listed above must appear in the story.\n- Use simple vocabulary suitable for intermediate learners.\n- The story must flow naturally and make sense.\n- Output only the story text. No titles, no word list, no explanations.\n\nWords used so far: (none — you must use all ${words.length} words above)`;
  console.log("Generated prompt for Gemini:", prompt);
  let geminiRes: Response;
  try {
    geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 600 },
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

  const story = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!story) {
    return NextResponse.json({ error: "Empty response from Gemini" }, { status: 502 });
  }

  return NextResponse.json({ story });
}
