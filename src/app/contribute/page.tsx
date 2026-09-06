"use client";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import api from "@/lib/api";
import { useSpeech } from "@/lib/useSpeech";
import {
  UserProfile,
  ContributeWordResult,
  Vocabulary,
  POS_LABELS,
  POS_COLORS,
  ApiResponse,
} from "@/types";

const GOAL = 10;

function formatThaiDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function AddedWordCard({
  v,
  onSpeak,
  isSpeaking,
}: {
  v: Vocabulary;
  onSpeak: (word: string) => void;
  isSpeaking: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--card-border)",
        borderRadius: 14,
        padding: "1.1rem 1.4rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "#e2e8f0" }}>{v.word}</span>
        <span
          style={{
            display: "inline-block",
            padding: "0.15rem 0.55rem",
            borderRadius: 6,
            fontSize: "0.7rem",
            fontWeight: 600,
            border: "1px solid",
            letterSpacing: "0.03em",
          }}
          className={POS_COLORS[v.partOfSpeech]}
        >
          {POS_LABELS[v.partOfSpeech]}
        </span>
        {v.cefrLevel && (
          <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8" }}>
            {v.cefrLevel}
          </span>
        )}
        {v.category && (
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>📂 {v.category.nameTh ?? v.category.name}</span>
        )}
        <button
          onClick={() => onSpeak(v.word)}
          title={`ออกเสียง "${v.word}"`}
          style={{
            marginLeft: "auto",
            width: 30,
            height: 30,
            borderRadius: 8,
            border: "1px solid var(--card-border)",
            background: isSpeaking ? "var(--accent)" : "transparent",
            color: isSpeaking ? "#fff" : "#94a3b8",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          🔊
        </button>
      </div>
      {(v.pronunciationThai || v.ipa) && (
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {v.pronunciationThai && (
            <span style={{ color: "#38bdf8", fontSize: "0.88rem" }}>🔉 {v.pronunciationThai}</span>
          )}
          {v.ipa && (
            <span style={{ color: "#94a3b8", fontSize: "0.85rem", fontFamily: "monospace" }}>/{v.ipa}/</span>
          )}
        </div>
      )}
      <p style={{ color: "#cbd5e1", fontSize: "0.95rem", lineHeight: 1.5 }}>{v.meaning}</p>
      {v.examples && v.examples.length > 0 && (
        <p
          style={{
            color: "#64748b",
            fontSize: "0.85rem",
            fontStyle: "italic",
            lineHeight: 1.5,
            borderLeft: "2px solid var(--card-border)",
            paddingLeft: "0.75rem",
          }}
        >
          {v.examples[0].sentence}
        </p>
      )}
    </div>
  );
}

export default function ContributePage() {
  const { speak, speaking, cancel } = useSpeech();
  const [speakingId, setSpeakingId] = useState<number | null>(null);

  const [word, setWord] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [contributedCount, setContributedCount] = useState(0);
  const [freeAccessUntil, setFreeAccessUntil] = useState<string | null>(null);
  const [addedWords, setAddedWords] = useState<Vocabulary[]>([]);
  const [lockedRedirect, setLockedRedirect] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLockedRedirect(new URLSearchParams(window.location.search).get("locked") === "1");
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<UserProfile>>("/user/me");
      setContributedCount(res.data.body.contributedWordsCount ?? 0);
      setFreeAccessUntil(res.data.body.freeAccessUntil ?? null);
    } catch {
      // ignore — page still usable, progress will sync after first submit
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadProfile(); }, [loadProfile]);

  const activeAccess = freeAccessUntil && new Date(freeAccessUntil) > new Date();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = word.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await api.post<ApiResponse<ContributeWordResult>>("/vocabularies/contribute", {
        word: trimmed,
      });
      const data = res.data.body;
      setAddedWords((prev) => [data.vocabulary, ...prev]);
      setContributedCount(data.contributedWordsCount);
      setFreeAccessUntil(data.freeAccessUntil);
      setSuccessMessage(
        data.bonusGranted
          ? `🎉 ครบ ${data.contributionGoal} คำ! คุณได้รับสิทธิ์ใช้งานฟรีเพิ่ม 7 วัน`
          : `เพิ่ม "${data.vocabulary.word}" สำเร็จ (${data.contributedWordsCount}/${data.contributionGoal})`,
      );
      setWord("");
      window.dispatchEvent(new CustomEvent("vocab:streak-refresh"));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        const msg = err.response.data.message;
        setError(Array.isArray(msg) ? msg.join(", ") : msg);
      } else {
        setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const progressPct = Math.min(100, (contributedCount / GOAL) * 100);

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.5rem" }}>
        ✨ เพิ่มคำศัพท์ แลกสิทธิ์ใช้งานฟรี
      </h1>
      <p style={{ color: "#94a3b8", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
        เพิ่มคำศัพท์ภาษาอังกฤษที่ยังไม่มีในระบบครบ {GOAL} คำ รับสิทธิ์ใช้งานฟรีเพิ่ม 7 วัน
        ระบบจะตรวจสอบคำซ้ำและให้ AI ช่วยเติมความหมาย คำอ่าน และหมวดหมู่ให้อัตโนมัติ
      </p>

      {lockedRedirect && !activeAccess && (
        <div
          style={{
            background: "rgba(251,146,60,0.1)",
            border: "1px solid rgba(251,146,60,0.3)",
            borderRadius: 10,
            padding: "0.75rem 1rem",
            color: "#fb923c",
            fontSize: "0.9rem",
            marginBottom: "1rem",
          }}
        >
          🔒 คุณยังไม่มีสิทธิ์ใช้งานฟีเจอร์นี้ เพิ่มคำศัพท์ให้ครบ {GOAL} คำเพื่อรับสิทธิ์ใช้งานฟรี 7 วัน
        </div>
      )}

      {/* Access status */}
      {activeAccess && (
        <div
          style={{
            background: "rgba(74,222,128,0.1)",
            border: "1px solid rgba(74,222,128,0.3)",
            borderRadius: 10,
            padding: "0.75rem 1rem",
            color: "#4ade80",
            fontSize: "0.9rem",
            marginBottom: "1rem",
          }}
        >
          ✅ คุณมีสิทธิ์ใช้งานฟรีถึงวันที่ {formatThaiDate(freeAccessUntil!)}
        </div>
      )}

      {/* Progress */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--card-border)",
          borderRadius: 12,
          padding: "1rem 1.25rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <span style={{ color: "#cbd5e1", fontSize: "0.9rem", fontWeight: 600 }}>
            ความคืบหน้า
          </span>
          <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
            {contributedCount}/{GOAL} คำ
          </span>
        </div>
        <div style={{ background: "#1e293b", borderRadius: 999, height: 8, overflow: "hidden" }}>
          <div
            style={{
              width: `${progressPct}%`,
              height: "100%",
              background: "linear-gradient(90deg,#6366f1,#22d3ee)",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="พิมพ์คำศัพท์ภาษาอังกฤษ เช่น serendipity"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          disabled={submitting}
          style={{
            flex: 1,
            background: "var(--card)",
            border: "1px solid var(--card-border)",
            borderRadius: 8,
            padding: "0.7rem 1rem",
            color: "#e2e8f0",
            fontSize: "1rem",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={submitting || !word.trim()}
          style={{
            padding: "0.7rem 1.5rem",
            borderRadius: 8,
            background: submitting || !word.trim() ? "#1e293b" : "var(--accent)",
            color: submitting || !word.trim() ? "#475569" : "#fff",
            border: "none",
            cursor: submitting || !word.trim() ? "default" : "pointer",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {submitting ? "กำลังตรวจสอบ..." : "เพิ่มคำศัพท์"}
        </button>
      </form>

      {error && (
        <div
          style={{
            background: "rgba(248,113,113,0.1)",
            border: "1px solid rgba(248,113,113,0.3)",
            borderRadius: 10,
            padding: "0.75rem 1rem",
            color: "#f87171",
            fontSize: "0.9rem",
            marginBottom: "1.5rem",
          }}
        >
          {error}
        </div>
      )}

      {successMessage && !error && (
        <div
          style={{
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: 10,
            padding: "0.75rem 1rem",
            color: "var(--accent-hover)",
            fontSize: "0.9rem",
            marginBottom: "1.5rem",
          }}
        >
          {successMessage}
        </div>
      )}

      {/* Added words this session */}
      {addedWords.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          {addedWords.map((v) => (
            <AddedWordCard
              key={v.id}
              v={v}
              isSpeaking={speaking && speakingId === v.id}
              onSpeak={(w) => {
                if (speaking && speakingId === v.id) {
                  cancel();
                  setSpeakingId(null);
                } else {
                  setSpeakingId(v.id);
                  speak(w);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
