"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import api from "@/lib/api";
import CustomSelect from "@/components/CustomSelect";
import {
  ConversationQuizCategory,
  ConversationQuizCategoryResponse,
  ConversationQuizQuestion,
  ConversationQuizResponse,
  QuizStats,
  ApiResponse,
} from "@/types";

interface ChatMessage {
  id: string;
  type: "speaker" | "user" | "feedback";
  speaker?: string;
  text: string;
  score?: number;
  maxScore?: number;
  naturalAnswer?: string;
}

/** Returns the score for a given choice (0–3). Falls back to 3/1 if choiceScores is absent. */
function getChoiceScore(q: ConversationQuizQuestion, choice: string): number {
  if (q.choiceScores) return q.choiceScores[choice] ?? 0;
  return choice === q.correctAnswer ? 3 : 1;
}

function getMaxScore(q: ConversationQuizQuestion): number {
  if (q.choiceScores) return Math.max(...Object.values(q.choiceScores));
  return 3;
}

function buildScoreLabel(score: number): string {
  if (score === 3) return "✨ Perfect!";
  if (score === 2) return "👍 Good answer!";
  if (score === 1) return "💡 Acceptable";
  return "📝 Understandable, but...";
}

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
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [scores, setScores] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const [waitingForNext, setWaitingForNext] = useState(false);
  const [quizStats, setQuizStats] = useState<QuizStats | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Derive chat messages from state — no side-effect setState needed
  const chatMessages = useMemo<ChatMessage[]>(() => {
    const msgs: ChatMessage[] = [];
    for (let i = 0; i <= index && i < questions.length; i++) {
      const q = questions[i];
      msgs.push({ id: `speaker-${i}`, type: "speaker", speaker: q.speaker, text: q.prompt });
      const answered = i < index || (i === index && waitingForNext);
      if (answered) {
        const score = scores[i] ?? 0;
        const maxScore = getMaxScore(q);
        msgs.push({ id: `user-${i}`, type: "user", text: selectedAnswers[i] ?? "" });
        msgs.push({
          id: `feedback-${i}`,
          type: "feedback",
          text: "",
          score,
          maxScore,
          naturalAnswer: q.naturalAnswer,
        });
      }
    }
    return msgs;
  }, [questions, index, selectedAnswers, scores, waitingForNext]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

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
    setSelectedAnswers([]);
    setScores([]);
    setFinished(false);
    setWaitingForNext(false);
    setQuizStats(null);
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
        { params: { categoryKey: selectedCategoryKey } },
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
    if (waitingForNext) return;
    const current = questions[index];
    const score = getChoiceScore(current, choice);
    setSelectedAnswers((prev) => [...prev, choice]);
    setScores((prev) => [...prev, score]);
    setWaitingForNext(true);

    // Record attempt on backend (fire-and-forget — no auth required for score local calc)
    api.post(`/conversation-quiz/questions/${current.id}/submit`, {
      selectedChoice: choice,
    }).catch(() => {});
  };

  const handleNext = () => {
    if (index + 1 >= questions.length) {
      setFinished(true);
      // Fetch updated stats after quiz completes
      api.get<ApiResponse<QuizStats>>("/conversation-quiz/stats")
        .then((res) => setQuizStats(res.data.body))
        .catch(() => {});
      return;
    }
    setIndex((prev) => prev + 1);
    setWaitingForNext(false);
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
            Conversation Chat
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
          เริ่มบทสนทนา →
        </button>
      </div>
    );
  }

  if (finished) {
    const totalScore = scores.reduce((a, b) => a + b, 0);
    const maxScore = questions.reduce((a, q) => a + getMaxScore(q), 0);

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
            {totalScore} / {maxScore} pts
          </div>
          <div style={{ fontSize: "1.6rem", letterSpacing: "0.08em", marginBottom: "0.35rem" }}>
            {buildStars(totalScore, maxScore)}
          </div>
          <div style={{ color: "#94a3b8" }}>
            {maxScore > 0 ? `${Math.round((totalScore / maxScore) * 100)}% naturalness score` : "สรุปผลการตอบในบทสนทนานี้"}
          </div>
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
          {questions.map((q, i) => {
            const qScore = scores[i] ?? 0;
            const qMax = getMaxScore(q);
            const scoreColor = qScore === qMax ? "#86efac" : qScore >= 2 ? "#fde68a" : "#94a3b8";
            return (
              <div
                key={q.id}
                style={{
                  padding: "0.7rem 0",
                  borderBottom: "1px solid var(--card-border)",
                  display: "grid",
                  gap: "0.25rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ color: "#e2e8f0", fontWeight: 700, flex: 1 }}>
                    {q.speaker}: {q.prompt}
                  </div>
                  <div style={{ color: scoreColor, fontWeight: 800, fontSize: "0.9rem", marginLeft: "0.75rem", flexShrink: 0 }}>
                    +{qScore}/{qMax}
                  </div>
                </div>
                <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                  Your answer: {selectedAnswers[i] || "-"}
                </div>
                <div style={{ color: "#cbd5e1", fontSize: "0.85rem" }}>
                  Most natural: {q.naturalAnswer}
                </div>
              </div>
            );
          })}
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

        {/* Overall stats across all categories */}
        {quizStats && (
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--card-border)",
              borderRadius: 16,
              padding: "1.2rem",
              marginTop: "1.2rem",
              textAlign: "left",
            }}
          >
            <div style={{ fontWeight: 700, color: "#e2e8f0", marginBottom: "0.75rem", fontSize: "0.95rem" }}>
              📊 สถิติรวมของคุณ
            </div>
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
              <div>
                <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>ทั้งหมด</div>
                <div style={{ fontWeight: 700, color: "#e2e8f0" }}>{quizStats.totalAttempts} ครั้ง</div>
              </div>
              <div>
                <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>ตอบถูก</div>
                <div style={{ fontWeight: 700, color: "#86efac" }}>{quizStats.correctCount}</div>
              </div>
              <div>
                <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>Accuracy</div>
                <div style={{ fontWeight: 700, color: "#facc15" }}>{Math.round(quizStats.accuracy * 100)}%</div>
              </div>
            </div>
            {quizStats.byCategory.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {quizStats.byCategory.map((cat) => (
                  <div key={cat.categoryKey} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "#94a3b8" }}>
                    <span>{cat.categoryName}</span>
                    <span>{cat.correct}/{cat.attempts} ({Math.round(cat.accuracy * 100)}%)</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const current = questions[index];
  const progress = ((index + (waitingForNext ? 1 : 0)) / questions.length) * 100;
  const runningScore = scores.reduce((a, b) => a + b, 0);
  const runningMax = questions.slice(0, scores.length).reduce((a, q) => a + getMaxScore(q), 0);

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "2rem auto",
        padding: "0 1.5rem",
        display: "flex",
        flexDirection: "column",
        height: "calc(100dvh - 130px)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "0.4rem",
          color: "#94a3b8",
          fontSize: "0.82rem",
        }}
      >
        <span>{(current.categoryEmoji ?? "💬") + " " + current.categoryName}</span>
        <span style={{ display: "flex", gap: "0.75rem" }}>
          {runningMax > 0 && (
            <span style={{ color: "#facc15", fontWeight: 700 }}>
              {runningScore} / {runningMax} pts
            </span>
          )}
          <span>{index + 1} / {questions.length}</span>
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: "100%",
          height: 6,
          background: "#1f2937",
          borderRadius: 999,
          overflow: "hidden",
          marginBottom: "0.85rem",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: "linear-gradient(90deg,#ec4899,#6366f1)",
            transition: "width .35s",
          }}
        />
      </div>

      {/* Chat messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "0.65rem",
          paddingBottom: "0.75rem",
        }}
      >
        {chatMessages.map((msg) => {
          if (msg.type === "speaker") {
            return (
              <div key={msg.id} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1rem",
                    flexShrink: 0,
                  }}
                >
                  💬
                </div>
                <div style={{ maxWidth: "75%" }}>
                  <div style={{ color: "#94a3b8", fontSize: "0.72rem", marginBottom: "0.3rem" }}>
                    {msg.speaker}
                  </div>
                  <div
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--card-border)",
                      borderRadius: "0 14px 14px 14px",
                      padding: "0.75rem 1rem",
                      color: "#f8fafc",
                      fontSize: "1rem",
                      lineHeight: 1.6,
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          }

          if (msg.type === "user") {
            return (
              <div key={msg.id} style={{ display: "flex", justifyContent: "flex-end" }}>
                <div
                  style={{
                    background: "var(--accent)",
                    borderRadius: "14px 0 14px 14px",
                    padding: "0.75rem 1rem",
                    color: "#fff",
                    maxWidth: "75%",
                    fontSize: "1rem",
                    lineHeight: 1.6,
                  }}
                >
                  {msg.text}
                </div>
              </div>
            );
          }

          if (msg.type === "feedback") {
            const score = msg.score ?? 0;
            const maxScore = msg.maxScore ?? 3;
            const isPerfect = score === maxScore;
            const isGood = score >= 2;
            const accentColor = isPerfect ? "#86efac" : isGood ? "#fde68a" : "#94a3b8";
            const bgColor = isPerfect ? "rgba(22,163,74,0.12)" : isGood ? "rgba(251,191,36,0.1)" : "rgba(100,116,139,0.1)";
            const borderColor = isPerfect ? "rgba(34,197,94,0.35)" : isGood ? "rgba(251,191,36,0.35)" : "rgba(100,116,139,0.35)";
            const icon = isPerfect ? "✅" : isGood ? "👍" : "💡";
            return (
              <div key={msg.id} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: bgColor,
                    border: `1px solid ${borderColor}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1rem",
                    flexShrink: 0,
                  }}
                >
                  {icon}
                </div>
                <div
                  style={{
                    maxWidth: "75%",
                    background: bgColor,
                    border: `1px solid ${borderColor}`,
                    borderRadius: "0 14px 14px 14px",
                    padding: "0.7rem 1rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                    <div style={{ color: accentColor, fontWeight: 700, fontSize: "0.85rem" }}>
                      {buildScoreLabel(score)}
                    </div>
                    <div style={{ color: accentColor, fontWeight: 900, fontSize: "0.85rem", marginLeft: "0.5rem" }}>
                      +{score} pt{score !== 1 ? "s" : ""}
                    </div>
                  </div>
                  {!isPerfect && (
                    <>
                      <div style={{ color: "#64748b", fontSize: "0.78rem", marginBottom: "0.15rem" }}>
                        Most natural:
                      </div>
                      <div style={{ color: "#e2e8f0", fontSize: "0.92rem", lineHeight: 1.5 }}>
                        {msg.naturalAnswer}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          }

          return null;
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div style={{ borderTop: "1px solid var(--card-border)", paddingTop: "0.85rem" }}>
        {!waitingForNext ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            <div style={{ color: "#64748b", fontSize: "0.75rem", marginBottom: "0.1rem" }}>
              เลือกคำตอบ...
            </div>
            {current.choices.map((choice) => (
              <button
                key={choice}
                onClick={() => handleSelect(choice)}
                style={{
                  textAlign: "left",
                  borderRadius: 24,
                  border: "1px solid var(--card-border)",
                  background: "transparent",
                  color: "#e2e8f0",
                  padding: "0.65rem 1rem",
                  cursor: "pointer",
                  fontSize: "0.95rem",
                  transition: "background 0.15s, border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(99,102,241,0.12)";
                  e.currentTarget.style.borderColor = "rgba(99,102,241,0.6)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "var(--card-border)";
                }}
              >
                {choice}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleNext}
              style={{
                border: "none",
                borderRadius: 24,
                padding: "0.7rem 1.5rem",
                fontWeight: 700,
                fontSize: "0.95rem",
                cursor: "pointer",
                background: "var(--accent)",
                color: "#fff",
              }}
            >
              {index + 1 >= questions.length ? "ดูผลลัพธ์ 🎯" : "ต่อไป →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
