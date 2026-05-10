"use client";
import { useState, useCallback } from "react";
import api from "@/lib/api";
import { ApiResponse } from "@/types";

interface FillBlankQuestion {
  sentence: string;
  answer: string;
  meaning: string;
  options: string[];
}

type FillBlankResponse = ApiResponse<FillBlankQuestion[]>;

const COUNT_OPTIONS = [5, 10, 15, 20];

export default function FillBlankPage() {
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<FillBlankQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState("");

  const start = useCallback(async () => {
    setLoading(true);
    setError("");
    setScore(0);
    setCurrent(0);
    setSelected(null);
    setFinished(false);
    setQuestions([]);
    try {
      const res = await api.get<FillBlankResponse>("/vocabularies/fill-blank", {
        params: { limit: count },
      });
      const data = res.data;
      if (!data.body || data.body.length === 0) {
        setError("ไม่พบข้อมูล กรุณาเพิ่มตัวอย่างประโยคในคลังคำศัพท์ก่อน");
        return;
      }
      setQuestions(data.body);
    } catch {
      setError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }, [count]);

  const handleSelect = (choice: string) => {
    if (selected !== null) return; // already answered
    setSelected(choice);
    if (choice === questions[current].answer) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
    }
  };

  const q = questions[current];
  const totalQ = questions.length;

  // --- Setup screen ---
  if (!loading && questions.length === 0 && !finished) {
    return (
      <div style={{ maxWidth: 520, margin: "4rem auto", padding: "0 1.5rem", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📝</div>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          Fill in the Blank
        </h1>
        <p style={{ color: "#94a3b8", marginBottom: "2rem" }}>
          เติมคำในช่องว่างให้ถูกต้องจากตัวเลือก
        </p>

        {error && (
          <div
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 12,
              padding: "0.85rem 1.25rem",
              color: "#fca5a5",
              fontSize: "0.9rem",
              marginBottom: "1.5rem",
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
            จำนวนข้อ
          </p>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
            {COUNT_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                style={{
                  padding: "0.4rem 1rem",
                  borderRadius: 8,
                  border: "1px solid",
                  borderColor: count === n ? "var(--accent)" : "var(--card-border)",
                  background: count === n ? "var(--accent)" : "transparent",
                  color: count === n ? "#fff" : "#94a3b8",
                  fontWeight: count === n ? 700 : 400,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  transition: "all 0.15s",
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
            padding: "0.75rem 2.5rem",
            borderRadius: 12,
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            color: "#fff",
            fontWeight: 700,
            fontSize: "1rem",
            border: "none",
            cursor: "pointer",
            width: "100%",
            maxWidth: 320,
          }}
        >
          เริ่มเล่น
        </button>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // --- Loading ---
  if (loading) {
    return (
      <div style={{ maxWidth: 520, margin: "4rem auto", padding: "0 1.5rem", textAlign: "center", color: "#475569" }}>
        <span
          style={{
            display: "inline-block",
            width: 22,
            height: 22,
            border: "2px solid #6366f1",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
            verticalAlign: "middle",
            marginRight: "0.5rem",
          }}
        />
        กำลังโหลด...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // --- Result screen ---
  if (finished) {
    const pct = Math.round((score / totalQ) * 100);
    const emoji = pct === 100 ? "🏆" : pct >= 70 ? "🎉" : pct >= 40 ? "😊" : "💪";
    return (
      <div style={{ maxWidth: 520, margin: "4rem auto", padding: "0 1.5rem", textAlign: "center" }}>
        <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>{emoji}</div>
        <h2 style={{ fontSize: "1.6rem", fontWeight: 700, marginBottom: "0.5rem" }}>ผลการทดสอบ</h2>
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--card-border)",
            borderRadius: 16,
            padding: "1.5rem",
            margin: "1.5rem 0",
          }}
        >
          <div style={{ fontSize: "3rem", fontWeight: 800, color: pct >= 70 ? "#86efac" : "#fca5a5" }}>
            {score} / {totalQ}
          </div>
          <div style={{ color: "#94a3b8", marginTop: "0.25rem" }}>{pct}%</div>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <button
            onClick={start}
            style={{
              padding: "0.6rem 1.5rem",
              borderRadius: 10,
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.9rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            เล่นใหม่
          </button>
          <button
            onClick={() => { setQuestions([]); setFinished(false); setError(""); }}
            style={{
              padding: "0.6rem 1.5rem",
              borderRadius: 10,
              background: "transparent",
              color: "#94a3b8",
              fontWeight: 600,
              fontSize: "0.9rem",
              border: "1px solid var(--card-border)",
              cursor: "pointer",
            }}
          >
            เปลี่ยนจำนวนข้อ
          </button>
        </div>
      </div>
    );
  }

  // --- Game screen ---
  const isCorrect = selected === q.answer;

  return (
    <div style={{ maxWidth: 560, margin: "2rem auto", padding: "0 1.5rem" }}>
      {/* Progress */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            color: "#94a3b8",
            fontSize: "0.85rem",
            marginBottom: "0.5rem",
          }}
        >
          <span>
            ข้อ <strong style={{ color: "#e2e8f0" }}>{current + 1}</strong> / {totalQ}
          </span>
          <span>
            คะแนน <strong style={{ color: "#86efac" }}>{score}</strong>
          </span>
        </div>
        <div
          style={{
            height: 4,
            borderRadius: 4,
            background: "var(--card-border)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${((current + 1) / totalQ) * 100}%`,
              background: "linear-gradient(90deg,#6366f1,#8b5cf6)",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Question card */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--card-border)",
          borderRadius: 20,
          padding: "2rem 1.5rem",
          marginBottom: "1.25rem",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "clamp(1.1rem, 3vw, 1.35rem)",
            fontWeight: 600,
            color: "#e2e8f0",
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          {q.sentence.split("___").map((part, idx, arr) => (
            <span key={idx}>
              {part}
              {idx < arr.length - 1 && (
                <span
                  style={{
                    display: "inline-block",
                    minWidth: "5ch",
                    borderBottom: selected
                      ? `2px solid ${isCorrect ? "#86efac" : "#fca5a5"}`
                      : "2px solid #6366f1",
                    color: selected
                      ? isCorrect ? "#86efac" : "#fca5a5"
                      : "transparent",
                    fontWeight: 700,
                    padding: "0 0.25rem",
                    textAlign: "center",
                    transition: "all 0.2s",
                  }}
                >
                  {selected ?? ""}
                </span>
              )}
            </span>
          ))}
        </p>

        {selected && (
          <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "1rem", marginBottom: 0 }}>
            {q.meaning}
          </p>
        )}
      </div>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {q.options.map((opt) => {
          let bg = "var(--card)";
          let borderColor = "var(--card-border)";
          let color = "#e2e8f0";

          if (selected) {
            if (opt === q.answer) {
              bg = "rgba(134,239,172,0.12)";
              borderColor = "#86efac";
              color = "#86efac";
            } else if (opt === selected && selected !== q.answer) {
              bg = "rgba(239,68,68,0.1)";
              borderColor = "#fca5a5";
              color = "#fca5a5";
            } else {
              color = "#475569";
            }
          }

          return (
            <button
              key={opt}
              onClick={() => handleSelect(opt)}
              disabled={selected !== null}
              style={{
                padding: "0.85rem 1.25rem",
                borderRadius: 12,
                border: `1px solid ${borderColor}`,
                background: bg,
                color,
                fontWeight: 500,
                fontSize: "1rem",
                textAlign: "left",
                cursor: selected ? "default" : "pointer",
                transition: "all 0.15s",
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {/* Feedback + Next */}
      {selected && (
        <div style={{ marginTop: "1.25rem", textAlign: "center" }}>
          <p
            style={{
              fontWeight: 700,
              fontSize: "1rem",
              color: isCorrect ? "#86efac" : "#fca5a5",
              marginBottom: "1rem",
            }}
          >
            {isCorrect ? "✅ ถูกต้อง!" : `❌ ผิด — คำตอบที่ถูกคือ "${q.answer}"`}
          </p>
          <button
            onClick={handleNext}
            style={{
              padding: "0.6rem 2rem",
              borderRadius: 10,
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.95rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            {current + 1 >= totalQ ? "ดูผลลัพธ์" : "ข้อถัดไป →"}
          </button>
        </div>
      )}
    </div>
  );
}
