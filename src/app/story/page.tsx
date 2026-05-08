"use client";
import { useState, useCallback, useEffect, startTransition } from "react";
import api from "@/lib/api";
import { useSpeech } from "@/lib/useSpeech";
import { Vocabulary, ApiResponse, POS_LABELS, POS_COLORS } from "@/types";

const QUOTA_KEY = "story_quota_reset_at";
const COOLDOWN_KEY = "story_last_generated_at";
const COOLDOWN_MS = 60_000; // 60 seconds

function getQuotaResetAt(): number | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(QUOTA_KEY);
  return v ? parseInt(v, 10) : null;
}

function setQuotaResetAt() {
  // Gemini resets daily quota at midnight Pacific time, use 24h from now as safe estimate
  const resetAt = Date.now() + 24 * 60 * 60 * 1000;
  localStorage.setItem(QUOTA_KEY, String(resetAt));
}

function clearQuotaResetAt() {
  localStorage.removeItem(QUOTA_KEY);
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const STORY_WORD_COUNT = 2;

function WordTooltip({ token, meaning }: { token: string; meaning: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline" }}>
      <span
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "rgba(99,102,241,0.25)",
          color: "#a5b4fc",
          borderRadius: 4,
          padding: "0 3px",
          fontWeight: 600,
          cursor: "pointer",
          borderBottom: "2px solid rgba(99,102,241,0.6)",
        }}
      >
        {token}
      </span>
      {open && (
        <>
          {/* backdrop to close on outside click */}
          <span
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10,
            }}
          />
          <span
            style={{
              position: "absolute",
              bottom: "calc(100% + 6px)",
              left: "50%",
              transform: "translateX(-50%)",
              background: "#1e293b",
              border: "1px solid rgba(99,102,241,0.5)",
              borderRadius: 8,
              padding: "0.35rem 0.7rem",
              fontSize: "0.82rem",
              color: "#e2e8f0",
              whiteSpace: "nowrap",
              zIndex: 11,
              boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
              pointerEvents: "none",
            }}
          >
            {meaning}
            {/* arrow */}
            <span
              style={{
                position: "absolute",
                top: "100%",
                left: "50%",
                transform: "translateX(-50%)",
                width: 0,
                height: 0,
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderTop: "5px solid rgba(99,102,241,0.5)",
              }}
            />
          </span>
        </>
      )}
    </span>
  );
}

// Highlight vocabulary words inside a story paragraph
function HighlightedStory({
  text,
  words,
}: {
  text: string;
  words: Vocabulary[];
}) {
  const wordMap = new Map(words.map((w) => [w.word.toLowerCase(), w]));

  // Split preserving whitespace and punctuation as separate tokens
  const tokens = text.split(/(\s+)/);

  return (
    <p
      style={{
        color: "#e2e8f0",
        fontSize: "1.05rem",
        lineHeight: 1.85,
        whiteSpace: "pre-wrap",
      }}
    >
      {tokens.map((token, i) => {
        const clean = token.replace(/[^a-zA-Z]/g, "").toLowerCase();
        const match = wordMap.get(clean);
        if (match) {
          return <WordTooltip key={i} token={token} meaning={match.meaning} />;
        }
        return token;
      })}
    </p>
  );
}

function WordChip({
  vocab,
  onRemove,
}: {
  vocab: Vocabulary;
  onRemove: () => void;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        background: "var(--card)",
        border: "1px solid var(--card-border)",
        borderRadius: 999,
        padding: "0.3rem 0.75rem 0.3rem 0.9rem",
      }}
    >
      <span
        style={{ fontWeight: 600, color: "#e2e8f0", fontSize: "0.9rem" }}
      >
        {vocab.word}
      </span>
      <span
        style={{
          display: "inline-block",
          padding: "0.1rem 0.4rem",
          borderRadius: 4,
          fontSize: "0.65rem",
          fontWeight: 600,
          border: "1px solid",
        }}
        className={POS_COLORS[vocab.partOfSpeech]}
      >
        {POS_LABELS[vocab.partOfSpeech]}
      </span>
      <button
        onClick={onRemove}
        title="ลบคำนี้"
        style={{
          background: "none",
          border: "none",
          color: "#64748b",
          cursor: "pointer",
          fontSize: "0.85rem",
          lineHeight: 1,
          padding: "0 2px",
          display: "flex",
          alignItems: "center",
        }}
      >
        ×
      </button>
    </div>
  );
}

export default function StoryPage() {
  const { speak, speaking, cancel } = useSpeech();
  const [selectedWords, setSelectedWords] = useState<Vocabulary[]>([]);
  const [story, setStory] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [cooldown, setCooldown] = useState(0); // seconds remaining
  // Load quota state from localStorage on mount
  const [quotaResetAt, setQuotaResetAtState] = useState<number | null>(null);

  // Sync from localStorage after hydration (client-only)
  useEffect(() => {
    const v = localStorage.getItem(QUOTA_KEY);
    if (!v) return;
    const resetAt = parseInt(v, 10);
    if (resetAt > Date.now()) {
      startTransition(() => setQuotaResetAtState(resetAt));
    } else {
      localStorage.removeItem(QUOTA_KEY);
    }
  }, []);

  // Sync cooldown from localStorage after hydration
  useEffect(() => {
    const last = localStorage.getItem(COOLDOWN_KEY);
    if (!last) return;
    const remaining = Math.ceil((parseInt(last, 10) + COOLDOWN_MS - Date.now()) / 1000);
    if (remaining > 0) startTransition(() => setCooldown(remaining));
  }, []);

  // Countdown timer for quota
  useEffect(() => {
    if (!quotaResetAt) return;
    const tick = () => {
      const remaining = quotaResetAt - Date.now();
      if (remaining <= 0) {
        setQuotaResetAtState(null);
        clearQuotaResetAt();
        setCountdown("");
      } else {
        setCountdown(formatCountdown(remaining));
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [quotaResetAt]);

  // Cooldown countdown — only start a new interval when cooldown transitions from 0 → positive
  const cooldownActive = cooldown > 0;
  useEffect(() => {
    if (!cooldownActive) return;
    const id = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(id); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownActive]);

  const fetchRandom = useCallback(async () => {
    setFetching(true);
    setError("");
    try {
      const res = await api.get<ApiResponse<Vocabulary[]>>("/vocabularies/random", {
        params: { limit: STORY_WORD_COUNT },
      });
      setSelectedWords(res.data.body.slice(0, STORY_WORD_COUNT));
      setStory("");
    } catch {
      setError("ไม่สามารถดึงคำศัพท์ได้ กรุณาลองใหม่");
    } finally {
      setFetching(false);
    }
  }, []);

  const removeWord = (id: number) => {
    setSelectedWords((prev) => prev.filter((w) => w.id !== id));
    setStory("");
  };

  const generateStory = async () => {
    if (selectedWords.length === 0 || quotaResetAt || cooldown > 0) return;
    setLoading(true);
    setError("");
    setStory("");
    try {
      const res = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          words: selectedWords.map((w) => ({ word: w.word, meaning: w.meaning })),
        }),
      });
      const data = (await res.json()) as { story?: string; error?: string };
      if (res.status === 429 && data.error === "QUOTA_EXCEEDED") {
        setQuotaResetAt();
        const resetAt = getQuotaResetAt()!;
        setQuotaResetAtState(resetAt);
      } else if (!res.ok || !data.story) {
        setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
      } else {
        setStory(data.story);
        localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
        setCooldown(COOLDOWN_MS / 1000);
      }
    } catch {
      setError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = () => {
    if (!story) return;
    if (isSpeaking) {
      cancel();
      setIsSpeaking(false);
    } else {
      speak(story);
      setIsSpeaking(true);
    }
  };

  // Sync speaking state when speech ends
  if (isSpeaking && !speaking) {
    setIsSpeaking(false);
  }

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1
          style={{
            fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
            fontWeight: 800,
            marginBottom: "0.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          🔥 Mini Story Mode
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "1rem", lineHeight: 1.6 }}>
          เลือก {STORY_WORD_COUNT} คำศัพท์ แล้วให้ AI สร้าง story สั้น ๆ
          เพื่อให้เข้าใจความหมายผ่าน context
        </p>
      </div>

      {/* Word Selection Card */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--card-border)",
          borderRadius: 16,
          padding: "1.5rem",
          marginBottom: "1.25rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1rem",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <span style={{ fontWeight: 600, color: "#e2e8f0", fontSize: "0.95rem" }}>
            คำศัพท์ที่เลือก ({selectedWords.length}/{STORY_WORD_COUNT})
          </span>
          <button
            onClick={fetchRandom}
            disabled={fetching}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "transparent",
              border: "1px solid var(--card-border)",
              borderRadius: 8,
              color: "#94a3b8",
              padding: "0.4rem 0.9rem",
              fontSize: "0.85rem",
              cursor: fetching ? "not-allowed" : "pointer",
              opacity: fetching ? 0.6 : 1,
              transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: "1rem" }}>🔀</span>
            {fetching ? "กำลังดึงคำ..." : "สุ่มคำใหม่"}
          </button>
        </div>

        {selectedWords.length === 0 ? (
          <p style={{ color: "#475569", fontSize: "0.9rem", textAlign: "center", padding: "1rem 0" }}>
            กด &quot;สุ่มคำใหม่&quot; เพื่อเริ่มต้น
          </p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {selectedWords.map((w) => (
              <WordChip key={w.id} vocab={w} onRemove={() => removeWord(w.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Word Reference List */}
      {selectedWords.length > 0 && (
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--card-border)",
            borderRadius: 16,
            padding: "1.25rem 1.5rem",
            marginBottom: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.55rem",
          }}
        >
          {selectedWords.map((w) => (
            <div
              key={w.id}
              style={{
                display: "flex",
                gap: "0.6rem",
                alignItems: "baseline",
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontWeight: 700, color: "#a5b4fc", fontSize: "0.9rem", minWidth: 80 }}>
                {w.word}
              </span>
              <span style={{ color: "#64748b", fontSize: "0.8rem" }}>—</span>
              <span style={{ color: "#cbd5e1", fontSize: "0.88rem" }}>{w.meaning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quota Exceeded Banner */}
      {quotaResetAt && (
        <div
          style={{
            background: "rgba(251,191,36,0.08)",
            border: "1px solid rgba(251,191,36,0.35)",
            borderRadius: 12,
            padding: "1rem 1.25rem",
            marginBottom: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.3rem",
          }}
        >
          <span style={{ fontWeight: 700, color: "#fbbf24", fontSize: "0.95rem" }}>
            ⏳ Quota หมดแล้ว — Feature ถูก pause ชั่วคราว
          </span>
          <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
            Gemini ฟรีอนุญาต 1,500 req/วัน — รีเซ็ตใน{" "}
            <span style={{ color: "#fbbf24", fontWeight: 600, fontFamily: "monospace" }}>
              {countdown}
            </span>
          </span>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={generateStory}
        disabled={loading || selectedWords.length === 0 || !!quotaResetAt || cooldown > 0}
        style={{
          width: "100%",
          padding: "0.85rem",
          borderRadius: 12,
          background:
            loading || selectedWords.length === 0 || quotaResetAt || cooldown > 0
              ? "#1e293b"
              : "linear-gradient(135deg, #6366f1, #8b5cf6)",
          color: loading || selectedWords.length === 0 || quotaResetAt || cooldown > 0 ? "#475569" : "#fff",
          fontWeight: 700,
          fontSize: "1rem",
          border: "none",
          cursor: loading || selectedWords.length === 0 || quotaResetAt || cooldown > 0 ? "not-allowed" : "pointer",
          marginBottom: "1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          transition: "opacity 0.15s",
        }}
      >
        {loading ? (
          <>
            <span
              style={{
                display: "inline-block",
                width: 16,
                height: 16,
                border: "2px solid #6366f1",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
              }}
            />
            กำลังสร้าง Story...
          </>
        ) : quotaResetAt ? (
          <>⏸ Paused — รอ {countdown}</>
        ) : cooldown > 0 ? (
          <>⏳ รอ {cooldown} วินาที</>
        ) : (
          <>✨ สร้าง Story</>
        )}
      </button>

      {/* Error */}
      {error && (
        <div
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 12,
            padding: "1rem 1.25rem",
            color: "#fca5a5",
            fontSize: "0.9rem",
            marginBottom: "1.25rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Story Output */}
      {story && (
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--card-border)",
            borderRadius: 16,
            padding: "1.5rem",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <span style={{ fontWeight: 700, color: "#e2e8f0", fontSize: "0.95rem" }}>
              📖 Story
            </span>
            <button
              onClick={handleSpeak}
              title={isSpeaking ? "หยุดอ่าน" : "ฟังเสียง"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                background: isSpeaking ? "var(--accent)" : "transparent",
                border: "1px solid var(--card-border)",
                borderRadius: 8,
                color: isSpeaking ? "#fff" : "#94a3b8",
                padding: "0.35rem 0.8rem",
                fontSize: "0.82rem",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {isSpeaking ? "⏹ หยุด" : "🔊 ฟัง"}
            </button>
          </div>

          <HighlightedStory text={story} words={selectedWords} />

          <p
            style={{
              marginTop: "1rem",
              color: "#475569",
              fontSize: "0.78rem",
              borderTop: "1px solid var(--card-border)",
              paddingTop: "0.75rem",
            }}
          >
            💡 แตะที่คำ{" "}
            <span style={{ color: "#a5b4fc", fontWeight: 600 }}>สีม่วง</span>{" "}
            เพื่อดูความหมาย
          </p>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
