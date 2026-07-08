"use client";
import { useState, useCallback, useRef } from "react";
import api from "@/lib/api";
import { useSpeech } from "@/lib/useSpeech";
import { DictationItem, ApiResponse } from "@/types";

const COUNT_OPTIONS = [5, 10, 15];

// ─── Diff helpers ────────────────────────────────────────────────────────────
function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, "")
    .trim();
}

function diffWords(
  input: string,
  expected: string,
): { word: string; correct: boolean }[] {
  const expWords = normalize(expected).split(/\s+/).filter(Boolean);
  const inpWords = normalize(input).split(/\s+/).filter(Boolean);
  return expWords.map((w, i) => ({ word: w, correct: inpWords[i] === w }));
}

function accuracyPct(input: string, expected: string): number {
  const exp = normalize(expected).split(/\s+/).filter(Boolean);
  const inp = normalize(input).split(/\s+/).filter(Boolean);
  if (exp.length === 0) return 100;
  const correct = exp.filter((w, i) => inp[i] === w).length;
  return Math.round((correct / exp.length) * 100);
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DictationPage() {
  const [count, setCount] = useState(10);
  const [items, setItems] = useState<DictationItem[]>([]);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [scores, setScores] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [playCount, setPlayCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { speak, speaking } = useSpeech();

  const start = useCallback(async () => {
    setLoading(true);
    setError("");
    setScores([]);
    setIndex(0);
    setInput("");
    setSubmitted(false);
    setFinished(false);
    setPlayCount(0);
    try {
      const res = await api.get<ApiResponse<DictationItem[]>>(
        "/vocabularies/dictation",
        { params: { limit: count } },
      );
      if (!res.data.body?.length) {
        setError("ไม่พบประโยคตัวอย่าง กรุณาเพิ่มประโยคตัวอย่างในคลังคำศัพท์ก่อน");
        return;
      }
      setItems(res.data.body);
    } catch {
      setError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }, [count]);

  const handlePlay = () => {
    if (!items[index]) return;
    speak(items[index].sentence);
    setPlayCount((n) => n + 1);
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const handleSubmit = () => {
    if (!input.trim()) return;
    const pct = accuracyPct(input, items[index].sentence);
    const isCorrect = pct >= 80;
    setScores((s) => [...s, pct]);
    setSubmitted(true);
    // Record review (correct = typed accurately enough)
    api
      .post(`/vocabularies/${items[index].vocabularyId}/review`, {
        correct: isCorrect,
      })
      .then(() => window.dispatchEvent(new CustomEvent("vocab:streak-refresh")))
      .catch(() => {});
  };

  const handleNext = () => {
    if (index + 1 >= items.length) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setInput("");
    setSubmitted(false);
    setPlayCount(0);
  };

  const current = items[index];

  // ── Setup / Loading ────────────────────────────────────────────────────────
  if (items.length === 0 && !finished) {
    if (loading) {
      return (
        <div style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>
          กำลังโหลด...
        </div>
      );
    }
    return (
      <div
        style={{
          maxWidth: 520,
          margin: "4rem auto",
          padding: "0 1.5rem",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎧</div>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          Dictation
        </h1>
        <p style={{ color: "#94a3b8", marginBottom: "2rem", lineHeight: 1.7 }}>
          ฟังประโยคภาษาอังกฤษ แล้วพิมพ์สิ่งที่ได้ยิน — ฝึกทักษะ Listening
        </p>

        {error && (
          <div
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 12,
              padding: "0.85rem 1.25rem",
              color: "#fca5a5",
              marginBottom: "1.5rem",
              fontSize: "0.9rem",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--card-border)",
            borderRadius: 16,
            padding: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
            จำนวนประโยค
          </p>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
            {COUNT_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                style={{
                  padding: "0.45rem 1.2rem",
                  borderRadius: 8,
                  border: "1px solid",
                  borderColor: count === n ? "var(--accent)" : "var(--card-border)",
                  background: count === n ? "var(--accent)" : "transparent",
                  color: count === n ? "#fff" : "#94a3b8",
                  fontWeight: count === n ? 700 : 400,
                  cursor: "pointer",
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={start}
          disabled={loading}
          style={{
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "0.75rem 2.5rem",
            fontSize: "1rem",
            fontWeight: 700,
            cursor: "pointer",
            width: "100%",
          }}
        >
          {loading ? "กำลังโหลด..." : "เริ่ม Dictation →"}
        </button>
      </div>
    );
  }

  // ── Finished ───────────────────────────────────────────────────────────────
  if (finished) {
    const avg = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
    const emoji = avg >= 90 ? "🏆" : avg >= 70 ? "🎉" : avg >= 50 ? "💪" : "📚";
    return (
      <div
        style={{
          maxWidth: 560,
          margin: "3rem auto",
          padding: "0 1.5rem",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>{emoji}</div>
        <h2 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          ผลการทำ Dictation
        </h2>
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--card-border)",
            borderRadius: 18,
            padding: "1.5rem",
            margin: "1.5rem 0",
          }}
        >
          <div
            style={{
              fontSize: "3.5rem",
              fontWeight: 800,
              color: avg >= 70 ? "#86efac" : "#fca5a5",
              marginBottom: "0.25rem",
            }}
          >
            {avg}%
          </div>
          <p style={{ color: "#94a3b8" }}>ความแม่นยำเฉลี่ย ({scores.length} ประโยค)</p>

          <div style={{ marginTop: "1.25rem", textAlign: "left" }}>
            {items.map((item, i) => (
              <div
                key={item.vocabularyId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "0.45rem 0",
                  borderBottom: "1px solid var(--card-border)",
                  fontSize: "0.85rem",
                  gap: "1rem",
                }}
              >
                <span
                  style={{
                    color: "#94a3b8",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                  }}
                >
                  {item.sentence}
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    color: (scores[i] ?? 0) >= 70 ? "#86efac" : "#fca5a5",
                    flexShrink: 0,
                  }}
                >
                  {scores[i] ?? 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <button
            onClick={start}
            style={{
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "0.7rem 1.5rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            เล่นใหม่
          </button>
          <button
            onClick={() => { setItems([]); setFinished(false); }}
            style={{
              background: "transparent",
              color: "#94a3b8",
              border: "1px solid var(--card-border)",
              borderRadius: 10,
              padding: "0.7rem 1.5rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            เปลี่ยนจำนวน
          </button>
        </div>
      </div>
    );
  }

  // ── Game ───────────────────────────────────────────────────────────────────
  const diff = submitted ? diffWords(input, current.sentence) : [];
  const pct = submitted ? accuracyPct(input, current.sentence) : 0;
  const progress = ((index + (submitted ? 1 : 0)) / items.length) * 100;

  return (
    <div style={{ maxWidth: 620, margin: "2rem auto", padding: "0 1.5rem" }}>
      {/* Progress */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          color: "#94a3b8",
          fontSize: "0.82rem",
          marginBottom: "0.4rem",
        }}
      >
        <span>ประโยคที่ {index + 1} / {items.length}</span>
        {scores.length > 0 && (
          <span>
            เฉลี่ย {Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}%
          </span>
        )}
      </div>
      <div
        style={{
          height: 4,
          background: "var(--card-border)",
          borderRadius: 4,
          overflow: "hidden",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "var(--accent)",
            borderRadius: 4,
            transition: "width 0.3s",
          }}
        />
      </div>

      {/* Card */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--card-border)",
          borderRadius: 18,
          padding: "2rem",
          marginBottom: "1.25rem",
          textAlign: "center",
        }}
      >
        {/* Play button */}
        <button
          onClick={handlePlay}
          disabled={speaking}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.6rem",
            padding: "0.75rem 1.75rem",
            borderRadius: 12,
            border: "none",
            background: speaking
              ? "rgba(99,102,241,0.25)"
              : "linear-gradient(135deg,#6366f1,#8b5cf6)",
            color: "#fff",
            fontWeight: 700,
            fontSize: "1rem",
            cursor: speaking ? "default" : "pointer",
            marginBottom: "0.5rem",
            transition: "all 0.15s",
          }}
        >
          {speaking ? "🔊 กำลังเล่น..." : "▶️ ฟังประโยค"}
        </button>
        {playCount > 0 && !submitted && (
          <p style={{ color: "#475569", fontSize: "0.78rem", marginTop: "0.4rem" }}>
            เล่นแล้ว {playCount} ครั้ง
            {playCount >= 3 && " — ลองพิมพ์จากความจำได้เลย!"}
          </p>
        )}

        {/* Word hint */}
        {!submitted && playCount > 0 && (
          <p style={{ color: "#64748b", fontSize: "0.82rem", marginTop: "0.75rem" }}>
            💡 คำหลัก: <span style={{ color: "#94a3b8", fontStyle: "italic" }}>{current.meaning}</span>
          </p>
        )}

        {/* Result diff */}
        {submitted && (
          <div style={{ marginTop: "1rem" }}>
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                color: pct >= 70 ? "#86efac" : "#fca5a5",
                marginBottom: "0.5rem",
              }}
            >
              {pct}% ถูกต้อง
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.3rem",
                justifyContent: "center",
                marginBottom: "0.75rem",
              }}
            >
              {diff.map((d, i) => (
                <span
                  key={i}
                  style={{
                    padding: "0.15rem 0.4rem",
                    borderRadius: 5,
                    fontSize: "0.95rem",
                    background: d.correct
                      ? "rgba(134,239,172,0.12)"
                      : "rgba(239,68,68,0.12)",
                    color: d.correct ? "#86efac" : "#fca5a5",
                    border: `1px solid ${d.correct ? "rgba(134,239,172,0.25)" : "rgba(239,68,68,0.25)"}`,
                  }}
                >
                  {d.word}
                </span>
              ))}
            </div>
            <p style={{ color: "#64748b", fontSize: "0.82rem" }}>
              คำว่า &ldquo;<span style={{ color: "#a78bfa" }}>{current.word}</span>&rdquo; — {current.meaning}
            </p>
          </div>
        )}
      </div>

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !submitted && input.trim()) handleSubmit(); }}
        disabled={submitted || playCount === 0}
        placeholder={playCount === 0 ? "กด ▶️ เพื่อฟังก่อน..." : "พิมพ์ประโยคที่ได้ยิน..."}
        style={{
          width: "100%",
          background: "var(--card)",
          border: `1px solid ${submitted ? "var(--card-border)" : "var(--accent)"}`,
          borderRadius: 12,
          padding: "0.9rem 1.1rem",
          color: "#e2e8f0",
          fontSize: "1rem",
          outline: "none",
          boxSizing: "border-box",
          opacity: submitted || playCount === 0 ? 0.6 : 1,
        }}
      />

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || playCount === 0}
            style={{
              flex: 1,
              padding: "0.75rem",
              borderRadius: 10,
              border: "none",
              background:
                !input.trim() || playCount === 0 ? "#1e293b" : "var(--accent)",
              color: !input.trim() || playCount === 0 ? "#475569" : "#fff",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: !input.trim() || playCount === 0 ? "default" : "pointer",
            }}
          >
            ตรวจคำตอบ
          </button>
        ) : (
          <button
            onClick={handleNext}
            style={{
              flex: 1,
              padding: "0.75rem",
              borderRadius: 10,
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            {index + 1 >= items.length ? "ดูผลลัพธ์ 🎯" : "ถัดไป →"}
          </button>
        )}
      </div>
    </div>
  );
}
