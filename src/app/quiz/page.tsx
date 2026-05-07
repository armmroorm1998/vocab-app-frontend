"use client";
import { useState } from "react";
import CustomSelect from "@/components/CustomSelect";
import api from "@/lib/api";
import { Vocabulary, EPartOfSpeech, POS_LABELS } from "@/types";
import { ApiResponse } from "@/types";

const ALL_POS = Object.values(EPartOfSpeech);

interface Question {
  vocab: Vocabulary;
  options: string[];
  correctAnswer: string;
}

function buildQuestions(vocabs: Vocabulary[]): Question[] {
  const allMeanings = [...new Set(vocabs.map((v) => v.meaning))];
  return vocabs.map((v) => {
    const distractors = allMeanings
      .filter((m) => m !== v.meaning)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    const options = [...distractors, v.meaning].sort(() => Math.random() - 0.5);
    return { vocab: v, options, correctAnswer: v.meaning };
  });
}

// --- Setup screen ---
function SetupScreen({
  onStart,
}: {
  onStart: (pos: EPartOfSpeech | "", count: number) => void;
}) {
  const [pos, setPos] = useState<EPartOfSpeech | "">("");
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    await onStart(pos, count);
    setLoading(false);
  };

  return (
    <div
      style={{
        maxWidth: 480,
        margin: "4rem auto",
        padding: "0 1.5rem",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎯</div>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.5rem" }}>
        Quiz
      </h1>
      <p style={{ color: "#94a3b8", marginBottom: "2rem" }}>
        ทดสอบความรู้คำศัพท์ด้วย Multiple Choice
      </p>

      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--card-border)",
          borderRadius: 16,
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ marginBottom: "1rem" }}>
          <label
            style={{
              display: "block",
              color: "#94a3b8",
              fontSize: "0.85rem",
              marginBottom: "0.4rem",
              textAlign: "left",
            }}
          >
            Part of Speech
          </label>
          <CustomSelect
            value={pos}
            onChange={(v) => setPos(v as EPartOfSpeech | "")}
            options={[
              { value: "", label: "ทั้งหมด" },
              ...ALL_POS.map((p) => ({ value: p, label: POS_LABELS[p] })),
            ]}
          />
        </div>
        <div>
          <label
            style={{
              display: "block",
              color: "#94a3b8",
              fontSize: "0.85rem",
              marginBottom: "0.4rem",
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
      </div>

      <button
        onClick={handleStart}
        disabled={loading}
        style={{
          background: "var(--accent)",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          padding: "0.75rem 2.5rem",
          fontSize: "1rem",
          fontWeight: 600,
          cursor: "pointer",
          width: "100%",
        }}
      >
        {loading ? "กำลังโหลด..." : "เริ่มทำแบบทดสอบ →"}
      </button>
    </div>
  );
}

// --- Quiz screen ---
function QuizScreen({
  questions,
  onFinish,
}: {
  questions: Question[];
  onFinish: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [scores, setScores] = useState<boolean[]>([]);

  const current = questions[index];
  const progress = ((index + 1) / questions.length) * 100;
  const answered = selected !== null;

  const handleSelect = (option: string) => {
    if (answered) return;
    setSelected(option);
  };

  const handleNext = () => {
    setScores((s) => [...s, selected === current.correctAnswer]);
    setSelected(null);
    setIndex((i) => i + 1);
  };

  if (!current) {
    const correct = scores.filter(Boolean).length;
    const total = questions.length;
    const pct = Math.round((correct / total) * 100);

    return (
      <div
        style={{
          maxWidth: 520,
          margin: "3rem auto",
          padding: "0 1.5rem",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
          {pct >= 80 ? "🏆" : pct >= 50 ? "💪" : "📚"}
        </div>
        <h2 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          ผลการทดสอบ
        </h2>
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--card-border)",
            borderRadius: 20,
            padding: "2rem",
            margin: "1.5rem 0",
          }}
        >
          <div
            style={{
              fontSize: "3.5rem",
              fontWeight: 800,
              color: pct >= 80 ? "#4ade80" : pct >= 50 ? "#fbbf24" : "#f87171",
              marginBottom: "0.5rem",
            }}
          >
            {pct}%
          </div>
          <p style={{ color: "#94a3b8" }}>
            ตอบถูก {correct} จาก {total} ข้อ
          </p>

          {/* Per-question summary */}
          <div style={{ marginTop: "1.5rem", textAlign: "left" }}>
            {questions.map((q, i) => (
              <div
                key={q.vocab.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.5rem 0",
                  borderBottom: "1px solid var(--card-border)",
                }}
              >
                <span style={{ fontSize: "1rem" }}>
                  {scores[i] ? "✅" : "❌"}
                </span>
                <span style={{ fontWeight: 600, color: "#e2e8f0", minWidth: 100 }}>
                  {q.vocab.word}
                </span>
                <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                  {q.vocab.meaning}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onFinish}
          style={{
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "0.75rem 2rem",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ทำใหม่อีกครั้ง
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 580, margin: "2rem auto", padding: "0 1.5rem" }}>
      {/* Progress */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.75rem",
        }}
      >
        <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
          ข้อที่ {index + 1} / {questions.length}
        </span>
        <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
          ถูก {scores.filter(Boolean).length}
        </span>
      </div>
      <div
        style={{
          height: 4,
          background: "var(--card-border)",
          borderRadius: 4,
          marginBottom: "2rem",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "var(--accent)",
            borderRadius: 4,
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* Question */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--card-border)",
          borderRadius: 16,
          padding: "2rem",
          textAlign: "center",
          marginBottom: "1.5rem",
        }}
      >
        <p style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
          คำนี้แปลว่าอะไร?
        </p>
        <p style={{ fontSize: "2rem", fontWeight: 800, color: "#e2e8f0", marginBottom: "0.25rem" }}>
          {current.vocab.word}
        </p>
        {current.vocab.pronunciationThai && (
          <p style={{ color: "#38bdf8", fontSize: "0.9rem" }}>
            {current.vocab.pronunciationThai}
          </p>
        )}
      </div>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {current.options.map((opt, idx) => {
          let bg = "var(--card)";
          let border = "var(--card-border)";
          let color = "#e2e8f0";
          if (answered) {
            if (opt === current.correctAnswer) {
              bg = "rgba(74,222,128,0.1)";
              border = "#4ade80";
              color = "#4ade80";
            } else if (opt === selected) {
              bg = "rgba(248,113,113,0.1)";
              border = "#f87171";
              color = "#f87171";
            }
          }
          return (
            <button
              key={`${idx}-${opt}`}
              onClick={() => handleSelect(opt)}
              style={{
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: 12,
                padding: "0.9rem 1.25rem",
                color,
                fontSize: "0.95rem",
                textAlign: "left",
                cursor: answered ? "default" : "pointer",
                fontWeight: opt === selected || (answered && opt === current.correctAnswer) ? 600 : 400,
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
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "0.75rem",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            width: "100%",
          }}
        >
          {index + 1 >= questions.length ? "ดูผลลัพธ์ 🎯" : "ถัดไป →"}
        </button>
      )}
    </div>
  );
}

// --- Root ---
export default function QuizPage() {
  const [questions, setQuestions] = useState<Question[] | null>(null);

  const handleStart = async (pos: EPartOfSpeech | "", count: number) => {
    try {
      const params: Record<string, string | number> = { limit: Math.max(count, 4) };
      if (pos) params.partOfSpeech = pos;
      const res = await api.get<ApiResponse<Vocabulary[]>>("/vocabularies/random", { params });
      const vocabs = res.data.body;
      // Deduplicate by word to avoid repeated questions for the same vocabulary
      const seen = new Set<string>();
      const uniqueVocabs = vocabs.filter((v) => {
        const key = v.word.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (uniqueVocabs.length < 2) {
        alert("ไม่มีคำศัพท์เพียงพอ กรุณา import ข้อมูลก่อน");
        return;
      }
      setQuestions(buildQuestions(uniqueVocabs.slice(0, count)));
    } catch {
      alert("โหลดคำศัพท์ไม่สำเร็จ กรุณาลองใหม่");
    }
  };

  if (!questions) {
    return <SetupScreen onStart={handleStart} />;
  }

  return (
    <QuizScreen
      questions={questions}
      onFinish={() => setQuestions(null)}
    />
  );
}
