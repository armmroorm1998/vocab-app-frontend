"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  ApiResponse,
  StreakInfo,
  QuizAttemptStats,
  QuizStats,
  WeakWord,
  Vocabulary,
} from "@/types";

// ─── Badge definitions ──────────────────────────────────────────────────────
interface BadgeDef {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  check: (
    streak: StreakInfo,
    quiz: QuizAttemptStats,
    conv: QuizStats,
    reviewDue: number,
  ) => boolean;
}

const BADGE_DEFS: BadgeDef[] = [
  {
    id: "first-step",
    emoji: "🌱",
    name: "First Step",
    desc: "เริ่มต้นการเรียนรู้ครั้งแรก",
    check: (_, q, c) => q.totalAttempts >= 1 || c.totalAttempts >= 1,
  },
  {
    id: "on-fire",
    emoji: "🔥",
    name: "On Fire",
    desc: "ต่อเนื่อง 3 วัน",
    check: (s) => s.currentStreak >= 3,
  },
  {
    id: "week-warrior",
    emoji: "⚔️",
    name: "Week Warrior",
    desc: "ต่อเนื่อง 7 วัน",
    check: (s) => s.currentStreak >= 7,
  },
  {
    id: "monthly-master",
    emoji: "👑",
    name: "Monthly Master",
    desc: "ต่อเนื่อง 30 วัน",
    check: (s) => s.currentStreak >= 30,
  },
  {
    id: "bookworm",
    emoji: "📚",
    name: "Bookworm",
    desc: "Longest streak ≥ 14 วัน",
    check: (s) => s.longestStreak >= 14,
  },
  {
    id: "sharp-shooter",
    emoji: "🎯",
    name: "Sharp Shooter",
    desc: "Quiz accuracy ≥ 90% (min 20 ข้อ)",
    check: (_, q) => q.totalAttempts >= 20 && q.accuracy >= 0.9,
  },
  {
    id: "century",
    emoji: "💯",
    name: "Century",
    desc: "ทำ Quiz ครบ 100 ข้อ",
    check: (_, q) => q.totalAttempts >= 100,
  },
  {
    id: "smooth-talker",
    emoji: "💬",
    name: "Smooth Talker",
    desc: "Conversation accuracy ≥ 80% (min 10 ข้อ)",
    check: (_, _q, c) => c.totalAttempts >= 10 && c.accuracy >= 0.8,
  },
  {
    id: "all-clear",
    emoji: "⭐",
    name: "All Clear",
    desc: "ทบทวนครบทุกคำที่ค้างอยู่",
    check: (_, _q, _c, r) => r === 0,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function StatCard({
  title,
  children,
  accent,
}: {
  title: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: `1px solid ${accent ? `${accent}33` : "var(--card-border)"}`,
        borderRadius: 16,
        padding: "1.4rem 1.5rem",
      }}
    >
      <div
        style={{
          color: accent ?? "#94a3b8",
          fontWeight: 700,
          fontSize: "0.8rem",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: "0.85rem",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function AccuracyBar({ value, total }: { value: number; total: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? "#86efac" : pct >= 60 ? "#fde68a" : "#fca5a5";
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "0.4rem",
        }}
      >
        <span style={{ fontSize: "2rem", fontWeight: 800, color }}>{pct}%</span>
        <span style={{ color: "#64748b", fontSize: "0.82rem" }}>{total} ครั้ง</span>
      </div>
      <div
        style={{
          height: 6,
          background: "var(--card-border)",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: 4,
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [quizStats, setQuizStats] = useState<QuizAttemptStats | null>(null);
  const [convStats, setConvStats] = useState<QuizStats | null>(null);
  const [reviewDue, setReviewDue] = useState<number | null>(null);
  const [weakWords, setWeakWords] = useState<WeakWord[]>([]);
  const [displayName, setDisplayName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [streakRes, quizRes, convRes, reviewRes, weakRes, meRes] =
          await Promise.allSettled([
            api.get<ApiResponse<StreakInfo>>("/user/streak"),
            api.get<ApiResponse<QuizAttemptStats>>("/vocabularies/quiz-stats"),
            api.get<ApiResponse<QuizStats>>("/conversation-quiz/stats"),
            api.get<ApiResponse<Vocabulary[]>>("/vocabularies/review", {
              params: { limit: 50 },
            }),
            api.get<ApiResponse<WeakWord[]>>("/vocabularies/weak", {
              params: { limit: 5 },
            }),
            api.get<ApiResponse<{ displayName: string }>>("/user/me"),
          ]);

        if (streakRes.status === "fulfilled") setStreak(streakRes.value.data.body);
        if (quizRes.status === "fulfilled") setQuizStats(quizRes.value.data.body);
        if (convRes.status === "fulfilled") setConvStats(convRes.value.data.body);
        if (reviewRes.status === "fulfilled")
          setReviewDue(reviewRes.value.data.body.length);
        if (weakRes.status === "fulfilled") setWeakWords(weakRes.value.data.body);
        if (meRes.status === "fulfilled")
          setDisplayName(meRes.value.data.body.displayName ?? "");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          maxWidth: 900,
          margin: "4rem auto",
          padding: "0 1.5rem",
          color: "#64748b",
          textAlign: "center",
        }}
      >
        กำลังโหลดข้อมูล...
      </div>
    );
  }

  const badges =
    streak && quizStats && convStats && reviewDue !== null
      ? BADGE_DEFS.map((b) => ({
          ...b,
          earned: b.check(streak, quizStats, convStats, reviewDue),
        }))
      : [];

  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: "0.25rem" }}>
          📊 Dashboard
        </h1>
        {displayName && (
          <p style={{ color: "#94a3b8", fontSize: "0.95rem" }}>
            สวัสดี, <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{displayName}</span>
          </p>
        )}
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "1.75rem",
        }}
      >
        {/* Streak */}
        {streak && (
          <StatCard title="🔥 Streak" accent="#fb923c">
            <div style={{ fontSize: "2.4rem", fontWeight: 900, color: "#fb923c", lineHeight: 1 }}>
              {streak.currentStreak}
              <span style={{ fontSize: "1rem", fontWeight: 600 }}> วัน</span>
            </div>
            <div style={{ color: "#64748b", fontSize: "0.8rem", marginTop: "0.35rem" }}>
              Longest: {streak.longestStreak} วัน
            </div>
            {/* Daily goal progress */}
            <div style={{ marginTop: "0.85rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.75rem",
                  color: "#64748b",
                  marginBottom: "0.3rem",
                }}
              >
                <span>เป้าหมายวันนี้</span>
                <span style={{ color: streak.goalMet ? "#86efac" : "#94a3b8" }}>
                  {streak.todayCount}/{streak.dailyGoal}
                  {streak.goalMet ? " ✓" : ""}
                </span>
              </div>
              <div
                style={{
                  height: 5,
                  background: "var(--card-border)",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, (streak.todayCount / streak.dailyGoal) * 100)}%`,
                    background: streak.goalMet ? "#86efac" : "#fb923c",
                    borderRadius: 4,
                    transition: "width 0.6s ease",
                  }}
                />
              </div>
            </div>
          </StatCard>
        )}

        {/* Quiz Stats */}
        {quizStats && (
          <StatCard title="🎯 Quiz" accent="#6366f1">
            <AccuracyBar value={quizStats.accuracy} total={quizStats.totalAttempts} />
            <div style={{ color: "#64748b", fontSize: "0.8rem", marginTop: "0.5rem" }}>
              ถูก {quizStats.correctCount} ข้อ
            </div>
          </StatCard>
        )}

        {/* Conversation Stats */}
        {convStats && (
          <StatCard title="💬 Conversation" accent="#ec4899">
            <AccuracyBar value={convStats.accuracy} total={convStats.totalAttempts} />
            <div style={{ color: "#64748b", fontSize: "0.8rem", marginTop: "0.5rem" }}>
              ถูก {convStats.correctCount} ครั้ง
            </div>
          </StatCard>
        )}

        {/* Review Due */}
        {reviewDue !== null && (
          <StatCard title="📚 ทบทวนวันนี้" accent="#22d3ee">
            <div
              style={{
                fontSize: "2.4rem",
                fontWeight: 900,
                color: reviewDue > 0 ? "#22d3ee" : "#86efac",
                lineHeight: 1,
              }}
            >
              {reviewDue}
              <span style={{ fontSize: "1rem", fontWeight: 600 }}> คำ</span>
            </div>
            <div style={{ marginTop: "0.75rem" }}>
              <Link
                href="/flashcard"
                style={{
                  display: "inline-block",
                  padding: "0.35rem 0.9rem",
                  borderRadius: 8,
                  background: reviewDue > 0 ? "rgba(34,211,238,0.15)" : "transparent",
                  border: `1px solid ${reviewDue > 0 ? "rgba(34,211,238,0.3)" : "var(--card-border)"}`,
                  color: reviewDue > 0 ? "#22d3ee" : "#64748b",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                {reviewDue > 0 ? "เริ่มทบทวน →" : "ครบแล้ว! ⭐"}
              </Link>
            </div>
          </StatCard>
        )}
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--card-border)",
            borderRadius: 16,
            padding: "1.4rem 1.5rem",
            marginBottom: "1.75rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <div style={{ fontWeight: 700, color: "#e2e8f0" }}>🎖️ Badges</div>
            <span style={{ color: "#64748b", fontSize: "0.82rem" }}>
              {earnedCount}/{badges.length} ได้รับแล้ว
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: "0.6rem",
            }}
          >
            {badges.map((b) => (
              <div
                key={b.id}
                title={b.desc}
                style={{
                  padding: "0.65rem 0.75rem",
                  borderRadius: 10,
                  border: `1px solid ${b.earned ? "rgba(250,204,21,0.35)" : "var(--card-border)"}`,
                  background: b.earned ? "rgba(250,204,21,0.08)" : "transparent",
                  opacity: b.earned ? 1 : 0.4,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  filter: b.earned ? "none" : "grayscale(1)",
                }}
              >
                <span style={{ fontSize: "1.3rem" }}>{b.emoji}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.8rem", color: b.earned ? "#fde68a" : "#94a3b8" }}>
                    {b.name}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#64748b", lineHeight: 1.3 }}>
                    {b.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weak words */}
      {weakWords.length > 0 && (
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--card-border)",
            borderRadius: 16,
            padding: "1.4rem 1.5rem",
          }}
        >
          <div style={{ fontWeight: 700, color: "#e2e8f0", marginBottom: "0.85rem" }}>
            📌 คำที่ตอบผิดบ่อย — ควรทบทวนพิเศษ
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {weakWords.map((w) => {
              const errorRate = w.total > 0 ? w.wrongCount / w.total : 0;
              const barColor =
                errorRate >= 0.7 ? "#fca5a5" : errorRate >= 0.4 ? "#fde68a" : "#94a3b8";
              return (
                <div
                  key={w.vocabularyId}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "120px 1fr auto",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.6rem 0",
                    borderBottom: "1px solid var(--card-border)",
                  }}
                >
                  <span style={{ fontWeight: 700, color: "#e2e8f0", fontSize: "0.95rem" }}>
                    {w.word}
                  </span>
                  <span style={{ color: "#64748b", fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {w.meaning}
                  </span>
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: barColor,
                      whiteSpace: "nowrap",
                    }}
                  >
                    ❌ {w.wrongCount}/{w.total}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Link
              href="/flashcard"
              style={{
                padding: "0.45rem 1rem",
                borderRadius: 8,
                background: "var(--accent)",
                color: "#fff",
                fontSize: "0.85rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              ทบทวนด้วย Flashcard →
            </Link>
            <Link
              href="/quiz"
              style={{
                padding: "0.45rem 1rem",
                borderRadius: 8,
                background: "transparent",
                border: "1px solid var(--card-border)",
                color: "#94a3b8",
                fontSize: "0.85rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              ลอง Quiz อีกครั้ง
            </Link>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!streak && !quizStats && !convStats && (
        <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚀</div>
          <p style={{ marginBottom: "1.5rem" }}>ยังไม่มีประวัติการเล่น — เริ่มเลย!</p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/quiz" style={{ padding: "0.6rem 1.5rem", borderRadius: 10, background: "var(--accent)", color: "#fff", fontWeight: 700, textDecoration: "none" }}>
              🎯 Quiz
            </Link>
            <Link href="/flashcard" style={{ padding: "0.6rem 1.5rem", borderRadius: 10, background: "#1e293b", color: "#e2e8f0", fontWeight: 700, textDecoration: "none" }}>
              🃏 Flashcard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
