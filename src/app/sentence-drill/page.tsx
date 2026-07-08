"use client";
import { useState, useCallback } from "react";
import CustomSelect from "@/components/CustomSelect";
import api from "@/lib/api";
import { Vocabulary, ApiResponse, EPartOfSpeech, POS_LABELS, POS_COLORS } from "@/types";

interface DrillQuestion {
  vocab: Vocabulary;
  sentence: string;
  options: string[]; // meanings
  correctAnswer: string;
}

function buildDrillQuestions(vocabs: Vocabulary[]): DrillQuestion[] {
  const allMeanings = [...new Set(vocabs.map((v) => v.meaning))];
  const questions: DrillQuestion[] = [];

  for (const v of vocabs) {
    const examples = v.examples ?? [];
    if (examples.length === 0) continue;
    const sentence = examples[Math.floor(Math.random() * examples.length)].sentence;

    const distractors = allMeanings
      .filter((m) => m !== v.meaning)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    if (distractors.length < 1) continue; // not enough distractors

    const options = [...distractors, v.meaning].sort(() => Math.random() - 0.5);
    questions.push({ vocab: v, sentence, options, correctAnswer: v.meaning });
  }
  return questions;
}

function highlight(sentence: string, word: string): React.ReactNode {
  const regex = new RegExp(`(\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\w*)`, "gi");
  const parts = sentence.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <span
        key={i}
        style={{
          color: "#a78bfa",
          fontWeight: 700,
          borderBottom: "2px solid #a78bfa55",
          paddingBottom: "1px",
        }}
      >
        {part}
      </span>
    ) : (
      part
    ),
  );
}

function Badge({ pos }: { pos: EPartOfSpeech }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.15rem 0.5rem",
        borderRadius: 5,
        fontSize: "0.7rem",
        fontWeight: 600,
        border: "1px solid",
      }}
      className={POS_COLORS[pos]}
    >
      {POS_LABELS[pos]}
    </span>
  );
}

export default function SentenceDrillPage() {
  const [questions, setQuestions] = useState<DrillQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [scores, setScores] = useState<boolean[]>([]);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(10);
  const [error, setError] = useState("");

  const start = useCallback(async () => {
    setLoading(true);
    setError("");
    setScores([]);
    setIndex(0);
    setSelected(null);
    setFinished(false);
    try {
      const res = await api.get<ApiResponse<Vocabulary[]>>("/vocabularies/random", {
        params: { limit: Math.max(count + 5, 15) }, // extra buffer for filtering
      });
      const vocabs = res.data.body ?? [];
      const qs = buildDrillQuestions(vocabs).slice(0, count);
      if (qs.length < 2) {
        setError("ไม่มีคำศัพท์ที่มีตัวอย่างประโยคเพียงพอ กรุณาเพิ่มประโยคตัวอย่างก่อน");
        return;
      }
      setQuestions(qs);
    } catch {
      setError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }, [count]);

  const handleSelect = (opt: string) => {
    if (selected !== null) return;
    setSelected(opt);
    const isCorrect = opt === questions[index].correctAnswer;
    setScores((s) => [...s, isCorrect]);
    // Record quiz attempt
    api
      .post(`/vocabularies/${questions[index].vocab.id}/quiz-answer`, {
        selectedAnswer: opt,
      })
      .then(() => window.dispatchEvent(new CustomEvent("vocab:streak-refresh")))
      .catch(() => {});
  };

  const handleNext = () => {
    if (index + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
  };

  const current = questions[index];

  // ── Setup / Loading ────────────────────────────────────────────────────────
  if (questions.length === 0 && !finished) {
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
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📖</div>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          Sentence Drill
        </h1>
        <p style={{ color: "#94a3b8", marginBottom: "2rem", lineHeight: 1.7 }}>
          อ่านประโยคตัวอย่าง → เลือกความหมายของคำที่ขีดเส้นใต้ — ฝึกเรียนจาก context จริง
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
          <label
            style={{
              display: "block",
              color: "#94a3b8",
              fontSize: "0.85rem",
              marginBottom: "0.5rem",
              textAlign: "left",
            }}
          >
            จำนวนข้อ
          </label>
          <CustomSelect
            value={String(count)}
            onChange={(v) => setCount(Number(v))}
            options={[5, 10, 15, 20].map((n) => ({ value: String(n), label: `${n} ข้อ` }))}
          />
        </div>

        <button
          onClick={start}
          disabled={loading}
          style={{
            background: "linear-gradient(135deg,#ec4899,#a855f7)",
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
          {loading ? "กำลังโหลด..." : "เริ่ม Sentence Drill →"}
        </button>
      </div>
    );
  }

  // ── Finished ───────────────────────────────────────────────────────────────
  if (finished) {
    const correct = scores.filter(Boolean).length;
    const pct = Math.round((correct / questions.length) * 100);
    const emoji = pct >= 80 ? "🏆" : pct >= 60 ? "🎉" : "💪";
    return (
      <div
        style={{
          maxWidth: 520,
          margin: "3rem auto",
          padding: "0 1.5rem",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>{emoji}</div>
        <h2 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          ผลการทำ Sentence Drill
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
              color: pct >= 70 ? "#86efac" : "#fca5a5",
              marginBottom: "0.25rem",
            }}
          >
            {pct}%
          </div>
          <p style={{ color: "#94a3b8" }}>
            ถูก {correct} จาก {questions.length} ข้อ
          </p>
          <div style={{ marginTop: "1.25rem", textAlign: "left" }}>
            {questions.map((q, i) => (
              <div
                key={q.vocab.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                  padding: "0.5rem 0",
                  borderBottom: "1px solid var(--card-border)",
                  fontSize: "0.85rem",
                }}
              >
                <span>{scores[i] ? "✅" : "❌"}</span>
                <div>
                  <span style={{ color: "#a78bfa", fontWeight: 600 }}>{q.vocab.word}</span>
                  <span style={{ color: "#64748b" }}> — {q.vocab.meaning}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <button
            onClick={start}
            style={{
              background: "linear-gradient(135deg,#ec4899,#a855f7)",
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
            onClick={() => { setQuestions([]); setFinished(false); }}
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
  const answered = selected !== null;
  const progress = ((index + 1) / questions.length) * 100;

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
        <span>ข้อที่ {index + 1} / {questions.length}</span>
        <span>ถูก {scores.filter(Boolean).length}</span>
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
            background: "linear-gradient(90deg,#ec4899,#a855f7)",
            borderRadius: 4,
            transition: "width 0.3s",
          }}
        />
      </div>

      {/* Question card */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--card-border)",
          borderRadius: 18,
          padding: "1.75rem 1.5rem",
          marginBottom: "1.25rem",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            marginBottom: "1rem",
            flexWrap: "wrap",
          }}
        >
          <Badge pos={current.vocab.partOfSpeech} />
          <span style={{ color: "#475569", fontSize: "0.78rem" }}>
            คำที่ขีดเส้นใต้หมายความว่าอะไร?
          </span>
        </div>
        <p
          style={{
            fontSize: "1.1rem",
            color: "#e2e8f0",
            lineHeight: 1.8,
            fontStyle: "italic",
          }}
        >
          &ldquo;{highlight(current.sentence, current.vocab.word)}&rdquo;
        </p>
      </div>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.25rem" }}>
        {current.options.map((opt) => {
          const isCorrect = opt === current.correctAnswer;
          const isSelected = opt === selected;

          let bg = "var(--card)";
          let border = "var(--card-border)";
          let color = "#e2e8f0";

          if (answered) {
            if (isCorrect) {
              bg = "rgba(134,239,172,0.1)";
              border = "#86efac";
              color = "#86efac";
            } else if (isSelected) {
              bg = "rgba(239,68,68,0.1)";
              border = "#fca5a5";
              color = "#fca5a5";
            } else {
              color = "#475569";
            }
          }

          return (
            <button
              key={opt}
              onClick={() => handleSelect(opt)}
              disabled={answered}
              style={{
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: 12,
                padding: "0.85rem 1.25rem",
                color,
                fontSize: "0.95rem",
                textAlign: "left",
                cursor: answered ? "default" : "pointer",
                fontWeight: isSelected || (answered && isCorrect) ? 600 : 400,
                transition: "all 0.15s",
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {answered && (
        <button
          onClick={handleNext}
          style={{
            width: "100%",
            padding: "0.75rem",
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg,#ec4899,#a855f7)",
            color: "#fff",
            fontWeight: 700,
            fontSize: "1rem",
            cursor: "pointer",
          }}
        >
          {index + 1 >= questions.length ? "ดูผลลัพธ์ 🎯" : "ถัดไป →"}
        </button>
      )}
    </div>
  );
}
