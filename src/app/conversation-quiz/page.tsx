"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import CustomSelect from "@/components/CustomSelect";
import {
  ConversationQuizCategory,
  ConversationQuizCategoryResponse,
  ConversationQuizQuestion,
  ConversationQuizResponse,
} from "@/types";

function buildStars(score: number, total: number): string {
  if (total <= 0) return "☆☆☆☆☆";
  const filled = Math.max(0, Math.min(5, Math.round((score / total) * 5)));
  return `${"★".repeat(filled)}${"☆".repeat(5 - filled)}`;
}

export default function ConversationQuizPage() {
  const [categories, setCategories] = useState<ConversationQuizCategory[]>([]);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState("");

  const [loadingSetup, setLoadingSetup] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState("");

  const [questions, setQuestions] = useState<ConversationQuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [scores, setScores] = useState<boolean[]>([]);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingSetup(true);
      setError("");
      try {
        const res = await api.get<ConversationQuizCategoryResponse>(
          "/conversation-quiz/categories",
        );
        const data = res.data.body ?? [];
        setCategories(data);
        if (data.length > 0) {
          setSelectedCategoryKey(data[0].key);
        }
      } catch {
        setError("โหลดหมวด Conversation ไม่สำเร็จ กรุณาลองใหม่");
      } finally {
        setLoadingSetup(false);
      }
    };

    void fetchCategories();
  }, []);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.key === selectedCategoryKey) ?? null,
    [categories, selectedCategoryKey],
  );

  const resetQuizState = () => {
    setQuestions([]);
    setIndex(0);
    setSelected(null);
    setSelectedAnswers([]);
    setScores([]);
    setFinished(false);
  };

  const startConversation = async () => {
    if (!selectedCategoryKey) {
      setError("กรุณาเลือกหมวดก่อนเริ่มฝึก");
      return;
    }

    setLoadingQuestions(true);
    setError("");
    resetQuizState();

    try {
      const res = await api.get<ConversationQuizResponse>(
        "/conversation-quiz/questions",
        {
          params: {
            categoryKey: selectedCategoryKey,
          },
        },
      );

      const list = res.data.body ?? [];
      if (list.length === 0) {
        setError("หมวดนี้ยังไม่มีบทสนทนาเพียงพอ ลองเลือกหมวดอื่น");
        return;
      }

      setQuestions(list);
    } catch {
      setError("เชื่อมต่อไม่ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleSelect = (choice: string) => {
    if (selected !== null) return;
    const current = questions[index];
    const isCorrect = choice === current.correctAnswer;
    setSelected(choice);
    setSelectedAnswers((prev) => [...prev, choice]);
    setScores((prev) => [...prev, isCorrect]);
  };

  const handleNext = () => {
    if (index + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setIndex((prev) => prev + 1);
    setSelected(null);
  };

  if ((loadingSetup || loadingQuestions) && questions.length === 0 && !finished) {
    return (
      <div
        style={{
          maxWidth: 620,
          margin: "4rem auto",
          padding: "0 1.5rem",
          textAlign: "center",
          color: "#94a3b8",
        }}
      >
        กำลังโหลด Conversation Quiz...
      </div>
    );
  }

  if (!loadingQuestions && questions.length === 0 && !finished) {
    return (
      <div style={{ maxWidth: 860, margin: "3rem auto", padding: "0 1.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "1.8rem" }}>
          <div style={{ fontSize: "2.8rem", marginBottom: "0.75rem" }}>💬</div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.45rem" }}>
            Conversation Quiz
          </h1>
          <p style={{ color: "#94a3b8", lineHeight: 1.7 }}>
            ฝึกภาษาอังกฤษในรูปแบบบทสนทนาจริง เลือกคำตอบที่เป็นธรรมชาติที่สุด
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.35)",
              borderRadius: 12,
              padding: "0.85rem 1rem",
              color: "#fca5a5",
              marginBottom: "1rem",
              textAlign: "center",
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
            padding: "1.2rem",
            marginBottom: "1.4rem",
          }}
        >
          <div style={{ color: "#94a3b8", marginBottom: "0.65rem", fontSize: "0.9rem" }}>
            เลือกหมวดสนทนา
          </div>
          <CustomSelect
            value={selectedCategoryKey}
            onChange={setSelectedCategoryKey}
            options={categories.map((c) => ({
              value: c.key,
              label: `${c.emoji ?? "💬"} ${c.name} (${c.totalQuestions} ข้อ)`,
            }))}
          />
          {selectedCategory && (
            <div style={{ marginTop: "0.7rem", color: "#94a3b8", fontSize: "0.82rem" }}>
              หมวดที่เลือก: {(selectedCategory.emoji ?? "💬") + " " + selectedCategory.name}
            </div>
          )}
        </div>

        <button
          onClick={startConversation}
          disabled={loadingQuestions || !selectedCategoryKey}
          style={{
            width: "100%",
            border: "none",
            borderRadius: 12,
            padding: "0.9rem 1rem",
            fontSize: "1rem",
            fontWeight: 800,
            cursor: loadingQuestions ? "not-allowed" : "pointer",
            color: "#fff",
            background: loadingQuestions ? "#64748b" : "var(--accent)",
          }}
        >
          เริ่มฝึก Conversation →
        </button>
      </div>
    );
  }

  if (finished) {
    const total = questions.length;
    const score = scores.filter(Boolean).length;

    return (
      <div style={{ maxWidth: 760, margin: "3rem auto", padding: "0 1.5rem", textAlign: "center" }}>
        <div style={{ fontSize: "2.8rem", marginBottom: "0.7rem" }}>🎯</div>
        <h2 style={{ fontSize: "1.9rem", fontWeight: 800, marginBottom: "0.5rem" }}>
          Conversation Complete
        </h2>
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--card-border)",
            borderRadius: 18,
            padding: "1.6rem",
            marginBottom: "1.2rem",
          }}
        >
          <div style={{ fontSize: "2.8rem", fontWeight: 900, color: "#facc15", marginBottom: "0.35rem" }}>
            {score} / {total}
          </div>
          <div style={{ fontSize: "1.6rem", letterSpacing: "0.08em", marginBottom: "0.35rem" }}>
            {buildStars(score, total)}
          </div>
          <div style={{ color: "#94a3b8" }}>สรุปผลการตอบในบทสนทนานี้</div>
        </div>

        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--card-border)",
            borderRadius: 18,
            padding: "1.2rem",
            textAlign: "left",
            marginBottom: "1rem",
          }}
        >
          {questions.map((q, i) => (
            <div
              key={q.id}
              style={{
                padding: "0.7rem 0",
                borderBottom: "1px solid var(--card-border)",
                display: "grid",
                gap: "0.25rem",
              }}
            >
              <div style={{ color: "#e2e8f0", fontWeight: 700 }}>
                {scores[i] ? "✅" : "❌"} {q.speaker}: {q.prompt}
              </div>
              <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                Your answer: {selectedAnswers[i] || "-"}
              </div>
              <div style={{ color: "#cbd5e1", fontSize: "0.85rem" }}>
                Natural answer: {q.naturalAnswer}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: "0.65rem", flexWrap: "wrap" }}>
          <button
            onClick={startConversation}
            style={{
              border: "none",
              borderRadius: 10,
              padding: "0.7rem 1.2rem",
              fontWeight: 700,
              cursor: "pointer",
              background: "var(--accent)",
              color: "#fff",
            }}
          >
            เล่นหมวดนี้อีกครั้ง
          </button>
          <button
            onClick={resetQuizState}
            style={{
              border: "1px solid var(--card-border)",
              borderRadius: 10,
              padding: "0.7rem 1.2rem",
              fontWeight: 700,
              cursor: "pointer",
              background: "transparent",
              color: "#cbd5e1",
            }}
          >
            เปลี่ยนหมวด
          </button>
        </div>
      </div>
    );
  }

  const current = questions[index];
  const answered = selected !== null;
  const correct = answered && selected === current.correctAnswer;
  const progress = ((index + 1) / questions.length) * 100;

  return (
    <div style={{ maxWidth: 820, margin: "2rem auto", padding: "0 1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", color: "#94a3b8", fontSize: "0.85rem" }}>
        <span>
          {(current.categoryEmoji ?? "💬") + " " + current.categoryName}
        </span>
        <span>
          Question {index + 1} / {questions.length}
        </span>
      </div>

      <div style={{ width: "100%", height: 10, background: "#1f2937", borderRadius: 999, overflow: "hidden", marginBottom: "1.1rem" }}>
        <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg,#ec4899,#6366f1)", transition: "width .25s" }} />
      </div>

      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--card-border)",
          borderRadius: 18,
          padding: "1.3rem",
        }}
      >
        <div style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "0.4rem" }}>
          {current.speaker}:
        </div>
        <div style={{ color: "#f8fafc", fontWeight: 800, fontSize: "1.18rem", lineHeight: 1.6, marginBottom: "1rem" }}>
          {current.prompt}
        </div>

        <div style={{ display: "grid", gap: "0.6rem" }}>
          {current.choices.map((choice) => {
            const isActive = selected === choice;
            const isCorrectChoice = answered && choice === current.correctAnswer;
            const isWrongSelected = answered && isActive && choice !== current.correctAnswer;
            return (
              <button
                key={choice}
                onClick={() => handleSelect(choice)}
                disabled={answered}
                style={{
                  textAlign: "left",
                  borderRadius: 12,
                  border: "1px solid",
                  borderColor: isCorrectChoice
                    ? "#16a34a"
                    : isWrongSelected
                      ? "#dc2626"
                      : isActive
                        ? "var(--accent)"
                        : "var(--card-border)",
                  background: isCorrectChoice
                    ? "rgba(22,163,74,0.2)"
                    : isWrongSelected
                      ? "rgba(220,38,38,0.18)"
                      : isActive
                        ? "rgba(99,102,241,0.18)"
                        : "transparent",
                  color: "#e2e8f0",
                  padding: "0.85rem 0.95rem",
                  cursor: answered ? "default" : "pointer",
                  fontSize: "1rem",
                }}
              >
                {choice}
              </button>
            );
          })}
        </div>

        {answered && (
          <div
            style={{
              marginTop: "1rem",
              borderRadius: 12,
              padding: "0.9rem 1rem",
              border: "1px solid",
              borderColor: correct ? "rgba(34,197,94,0.45)" : "rgba(251,191,36,0.45)",
              background: correct ? "rgba(34,197,94,0.14)" : "rgba(251,191,36,0.12)",
            }}
          >
            <div style={{ color: correct ? "#86efac" : "#fde68a", fontWeight: 800, marginBottom: "0.4rem" }}>
              {correct ? "Correct ✅" : "Better Answer ✅"}
            </div>
            <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "0.2rem" }}>
              Your answer:
            </div>
            <div style={{ color: "#e2e8f0", marginBottom: "0.45rem" }}>{selected}</div>
            <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "0.2rem" }}>
              Natural answer:
            </div>
            <div style={{ color: "#e2e8f0" }}>{current.naturalAnswer}</div>
          </div>
        )}

        <div style={{ marginTop: "1rem", textAlign: "right" }}>
          <button
            onClick={handleNext}
            disabled={!answered}
            style={{
              border: "none",
              borderRadius: 10,
              padding: "0.68rem 1.3rem",
              fontWeight: 800,
              fontSize: "0.95rem",
              cursor: answered ? "pointer" : "not-allowed",
              background: answered ? "var(--accent)" : "#64748b",
              color: "#fff",
            }}
          >
            {index + 1 >= questions.length ? "ดูผลลัพธ์" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
