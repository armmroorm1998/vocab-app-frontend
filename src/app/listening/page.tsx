"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import YouTubeUnitPlayer from "@/components/YouTubeUnitPlayer";
import {
  ListeningLessonSummary,
  ListeningLessonsResponse,
  ListeningUnitSummary,
  ListeningUnitsResponse,
  ListeningUnitDetail,
  ListeningUnitDetailResponse,
  ListeningUnitCloze,
  ListeningUnitClozeResponse,
} from "@/types";

type Mode = "read" | "cloze";
type Side = "left" | "right";

function normalizeAnswer(s: string): string {
  return s.trim().toLowerCase();
}

/** Assigns each distinct speaker a chat side, alternating by order of first appearance. */
function buildSpeakerSides(lines: { speaker: string }[]): Record<string, Side> {
  const sides: Record<string, Side> = {};
  let next: Side = "left";
  for (const l of lines) {
    if (!(l.speaker in sides)) {
      sides[l.speaker] = next;
      next = next === "left" ? "right" : "left";
    }
  }
  return sides;
}

function ChatBubble({
  speaker,
  side,
  children,
}: {
  speaker: string;
  side: Side;
  children: React.ReactNode;
}) {
  const isRight = side === "right";
  return (
    <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", justifyContent: isRight ? "flex-end" : "flex-start" }}>
      {!isRight && (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.85rem",
            fontWeight: 700,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          {speaker.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div style={{ maxWidth: "75%" }}>
        <div
          style={{
            color: "#94a3b8",
            fontSize: "0.72rem",
            marginBottom: "0.3rem",
            textAlign: isRight ? "right" : "left",
          }}
        >
          {speaker}
        </div>
        <div
          style={{
            background: isRight ? "var(--accent)" : "var(--card)",
            border: isRight ? "none" : "1px solid var(--card-border)",
            borderRadius: isRight ? "14px 0 14px 14px" : "0 14px 14px 14px",
            padding: "0.75rem 1rem",
            color: isRight ? "#fff" : "#f8fafc",
            fontSize: "1rem",
            lineHeight: 1.6,
          }}
        >
          {children}
        </div>
      </div>
      {isRight && (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.85rem",
            fontWeight: 700,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          {speaker.slice(0, 1).toUpperCase()}
        </div>
      )}
    </div>
  );
}

export default function ListeningPage() {
  const [lessons, setLessons] = useState<ListeningLessonSummary[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [selectedLessonKey, setSelectedLessonKey] = useState<string | null>(null);

  const [units, setUnits] = useState<ListeningUnitSummary[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [error, setError] = useState("");

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("read");
  const [showThai, setShowThai] = useState(false);

  const [detail, setDetail] = useState<ListeningUnitDetail | null>(null);
  const [cloze, setCloze] = useState<ListeningUnitCloze | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const fetchLessons = async () => {
      setLoadingLessons(true);
      setError("");
      try {
        const res = await api.get<ListeningLessonsResponse>("/listening/lessons");
        setLessons(res.data.body ?? []);
      } catch {
        setError("โหลดรายการบทเรียนไม่สำเร็จ กรุณาลองใหม่");
      } finally {
        setLoadingLessons(false);
      }
    };
    void fetchLessons();
  }, []);

  const openLesson = async (lessonKey: string) => {
    setSelectedLessonKey(lessonKey);
    setUnits([]);
    setLoadingUnits(true);
    setError("");
    try {
      const res = await api.get<ListeningUnitsResponse>(
        `/listening/lessons/${lessonKey}/units`,
      );
      setUnits(res.data.body ?? []);
    } catch {
      setError("โหลดรายการ Unit ไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoadingUnits(false);
    }
  };

  const backToLessons = () => {
    setSelectedLessonKey(null);
    setUnits([]);
  };

  const openUnit = async (key: string, initialMode: Mode = "read") => {
    setSelectedKey(key);
    setMode(initialMode);
    setDetail(null);
    setCloze(null);
    setAnswers({});
    setChecked({});
    setLoadingDetail(true);
    setError("");
    try {
      if (initialMode === "read") {
        const res = await api.get<ListeningUnitDetailResponse>(
          `/listening/units/${key}`,
        );
        setDetail(res.data.body);
      } else {
        const res = await api.get<ListeningUnitClozeResponse>(
          `/listening/units/${key}/cloze`,
        );
        setCloze(res.data.body);
      }
    } catch {
      setError("โหลดข้อมูล Unit ไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoadingDetail(false);
    }
  };

  const switchMode = async (next: Mode) => {
    if (!selectedKey || next === mode) return;
    setMode(next);
    if (next === "cloze" && !cloze) {
      setLoadingDetail(true);
      try {
        const res = await api.get<ListeningUnitClozeResponse>(
          `/listening/units/${selectedKey}/cloze`,
        );
        setCloze(res.data.body);
      } catch {
        setError("โหลดโหมดเติมคำไม่สำเร็จ กรุณาลองใหม่");
      } finally {
        setLoadingDetail(false);
      }
    }
    if (next === "read" && !detail) {
      setLoadingDetail(true);
      try {
        const res = await api.get<ListeningUnitDetailResponse>(
          `/listening/units/${selectedKey}`,
        );
        setDetail(res.data.body);
      } catch {
        setError("โหลดบทสนทนาไม่สำเร็จ กรุณาลองใหม่");
      } finally {
        setLoadingDetail(false);
      }
    }
  };

  const backToList = () => {
    setSelectedKey(null);
    setDetail(null);
    setCloze(null);
  };

  const current = detail ?? cloze;

  const speakerSides = useMemo(() => {
    if (mode === "read" && detail) return buildSpeakerSides(detail.lines);
    if (mode === "cloze" && cloze) return buildSpeakerSides(cloze.lines);
    return {};
  }, [mode, detail, cloze]);

  // ── Lesson list ──────────────────────────────────────────────────────────
  if (!selectedLessonKey) {
    return (
      <div style={{ maxWidth: 720, margin: "3rem auto", padding: "0 1.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "1.8rem" }}>
          <div style={{ fontSize: "2.8rem", marginBottom: "0.75rem" }}>🎧</div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.45rem" }}>
            Listening & Shadowing
          </h1>
          <p style={{ color: "#94a3b8", lineHeight: 1.7 }}>
            เลือกบทเรียน แล้วฟังบทสนทนาจริงจากวิดีโอ พูดตาม หรือฝึกเติมคำในช่องว่างทีละ Unit
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

        {loadingLessons ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "2rem" }}>
            กำลังโหลดบทเรียน...
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {lessons.map((l) => (
              <button
                key={l.key}
                onClick={() => openLesson(l.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  textAlign: "left",
                  background: "var(--card)",
                  border: "1px solid var(--card-border)",
                  borderRadius: 14,
                  padding: "0.9rem 1.1rem",
                  cursor: "pointer",
                  color: "#e2e8f0",
                }}
              >
                <span style={{ fontSize: "1.4rem" }}>{l.emoji ?? "🎬"}</span>
                <span style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{l.title}</div>
                  <div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                    {l.totalUnits} Unit
                  </div>
                </span>
                <span style={{ color: "#64748b" }}>→</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Unit list ────────────────────────────────────────────────────────────
  if (!selectedKey) {
    return (
      <div style={{ maxWidth: 720, margin: "3rem auto", padding: "0 1.5rem" }}>
        <button
          onClick={backToLessons}
          style={{
            border: "none",
            background: "transparent",
            color: "#94a3b8",
            cursor: "pointer",
            marginBottom: "1rem",
            fontSize: "0.85rem",
          }}
        >
          ← กลับไปเลือกบทเรียน
        </button>

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

        {loadingUnits ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "2rem" }}>
            กำลังโหลด Unit...
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {units.map((u) => (
              <button
                key={u.key}
                onClick={() => openUnit(u.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  textAlign: "left",
                  background: "var(--card)",
                  border: "1px solid var(--card-border)",
                  borderRadius: 14,
                  padding: "0.9rem 1.1rem",
                  cursor: "pointer",
                  color: "#e2e8f0",
                }}
              >
                <span style={{ fontSize: "1.4rem" }}>{u.emoji ?? "🎧"}</span>
                <span style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{u.title}</div>
                  <div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                    {u.totalLines} ประโยค
                  </div>
                </span>
                <span style={{ color: "#64748b" }}>→</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Unit detail (read / cloze) — chat-style ─────────────────────────────
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
      <button
        onClick={backToList}
        style={{
          border: "none",
          background: "transparent",
          color: "#94a3b8",
          cursor: "pointer",
          marginBottom: "0.5rem",
          fontSize: "0.85rem",
          alignSelf: "flex-start",
        }}
      >
        ← กลับไปเลือก Unit
      </button>

      {current && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
            <span style={{ fontSize: "1.2rem" }}>{current.emoji ?? "🎧"}</span>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>{current.title}</h2>
          </div>

          <YouTubeUnitPlayer
            videoId={current.videoId}
            startSeconds={current.startSeconds}
            endSeconds={current.endSeconds}
          />

          <div style={{ display: "flex", gap: "0.5rem", margin: "0.85rem 0" }}>
            <button
              onClick={() => switchMode("read")}
              style={{
                border: "1px solid var(--card-border)",
                borderRadius: 24,
                padding: "0.5rem 0.9rem",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: "pointer",
                background: mode === "read" ? "var(--accent)" : "transparent",
                color: mode === "read" ? "#fff" : "#cbd5e1",
              }}
            >
              📖 อ่านตาม
            </button>
            <button
              onClick={() => switchMode("cloze")}
              style={{
                border: "1px solid var(--card-border)",
                borderRadius: 24,
                padding: "0.5rem 0.9rem",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: "pointer",
                background: mode === "cloze" ? "var(--accent)" : "transparent",
                color: mode === "cloze" ? "#fff" : "#cbd5e1",
              }}
            >
              📝 เติมคำ
            </button>
            <button
              onClick={() => setShowThai((v) => !v)}
              style={{
                marginLeft: "auto",
                border: "1px solid var(--card-border)",
                borderRadius: 24,
                padding: "0.5rem 0.9rem",
                fontSize: "0.85rem",
                cursor: "pointer",
                background: showThai ? "rgba(99,102,241,0.12)" : "transparent",
                color: "#94a3b8",
              }}
            >
              {showThai ? "🇹🇭 ซ่อนคำแปล" : "🇹🇭 แสดงคำแปล"}
            </button>
          </div>

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
            {loadingDetail && (
              <div style={{ textAlign: "center", color: "#94a3b8", padding: "1.5rem" }}>
                กำลังโหลด...
              </div>
            )}

            {!loadingDetail &&
              mode === "read" &&
              detail &&
              detail.lines.map((l) => (
                <ChatBubble key={l.orderIndex} speaker={l.speaker} side={speakerSides[l.speaker] ?? "left"}>
                  {l.textEn}
                  {showThai && l.textTh && (
                    <div style={{ marginTop: "0.35rem", fontSize: "0.85rem", opacity: 0.85 }}>
                      {l.textTh}
                    </div>
                  )}
                </ChatBubble>
              ))}

            {!loadingDetail &&
              mode === "cloze" &&
              cloze &&
              cloze.lines.map((l) => {
                const isChecked = !!checked[l.orderIndex];
                const userAnswer = answers[l.orderIndex] ?? "";
                const isCorrect =
                  isChecked &&
                  l.answer != null &&
                  normalizeAnswer(userAnswer) === normalizeAnswer(l.answer);

                return (
                  <ChatBubble key={l.orderIndex} speaker={l.speaker} side={speakerSides[l.speaker] ?? "left"}>
                    {l.blankText && l.answer ? (
                      <>
                        <div style={{ marginBottom: "0.5rem" }}>{l.blankText}</div>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <input
                            value={userAnswer}
                            disabled={isChecked}
                            onChange={(e) =>
                              setAnswers((prev) => ({ ...prev, [l.orderIndex]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !isChecked && userAnswer.trim()) {
                                setChecked((prev) => ({ ...prev, [l.orderIndex]: true }));
                              }
                            }}
                            placeholder="พิมพ์คำที่หายไป..."
                            style={{
                              flex: 1,
                              background: "rgba(255,255,255,0.08)",
                              border: `1px solid ${isChecked ? "var(--card-border)" : "rgba(255,255,255,0.4)"}`,
                              borderRadius: 8,
                              padding: "0.4rem 0.65rem",
                              color: "inherit",
                              fontSize: "0.9rem",
                              outline: "none",
                            }}
                          />
                          {!isChecked ? (
                            <button
                              onClick={() =>
                                setChecked((prev) => ({ ...prev, [l.orderIndex]: true }))
                              }
                              disabled={!userAnswer.trim()}
                              style={{
                                border: "none",
                                borderRadius: 8,
                                padding: "0.4rem 0.85rem",
                                fontWeight: 700,
                                fontSize: "0.85rem",
                                cursor: userAnswer.trim() ? "pointer" : "default",
                                background: userAnswer.trim() ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)",
                                color: "inherit",
                              }}
                            >
                              ตรวจ
                            </button>
                          ) : (
                            <span
                              style={{
                                display: "flex",
                                alignItems: "center",
                                fontWeight: 700,
                                fontSize: "0.85rem",
                                color: isCorrect ? "#86efac" : "#fecaca",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {isCorrect ? "✅ ถูกต้อง" : `❌ คำตอบ: ${l.answer}`}
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      l.textEn
                    )}
                    {showThai && l.textTh && (
                      <div style={{ marginTop: "0.35rem", fontSize: "0.85rem", opacity: 0.85 }}>
                        {l.textTh}
                      </div>
                    )}
                  </ChatBubble>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
}
