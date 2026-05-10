"use client";
import { useState } from "react";
import CustomSelect from "@/components/CustomSelect";
import api from "@/lib/api";
import { Vocabulary, EPartOfSpeech, POS_LABELS, POS_COLORS } from "@/types";
import { ApiResponse } from "@/types";

const ALL_POS = Object.values(EPartOfSpeech);

function Badge({ pos }: { pos: EPartOfSpeech }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.2rem 0.6rem",
        borderRadius: 6,
        fontSize: "0.75rem",
        fontWeight: 600,
        border: "1px solid",
      }}
      className={POS_COLORS[pos]}
    >
      {POS_LABELS[pos]}
    </span>
  );
}

export default function FlashcardPage() {
  const [cards, setCards] = useState<Vocabulary[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [pos, setPos] = useState<EPartOfSpeech | "">("");
  const [count, setCount] = useState(20);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  const loadCards = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { limit: count };
      if (pos) params.partOfSpeech = pos;
      const res = await api.get<ApiResponse<Vocabulary[]>>("/vocabularies/random", { params });
      setCards(res.data.body);
      setIndex(0);
      setFlipped(false);
      setStarted(true);
    } catch {
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  const current = cards[index];
  const progress = cards.length > 0 ? ((index + 1) / cards.length) * 100 : 0;

  if (!started) {
    return (
      <div
        style={{
          maxWidth: 520,
          margin: "4rem auto",
          padding: "2rem 1.5rem",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🃏</div>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          Flashcard
        </h1>
        <p style={{ color: "#94a3b8", marginBottom: "2rem" }}>
          เลือกตัวเลือกแล้วกด &quot;เริ่มเลย&quot; เพื่อเริ่มฝึก
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
            <label style={{ display: "block", color: "#94a3b8", fontSize: "0.85rem", marginBottom: "0.4rem" }}>
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
            <label style={{ display: "block", color: "#94a3b8", fontSize: "0.85rem", marginBottom: "0.4rem" }}>
              จำนวนการ์ด
            </label>
            <CustomSelect
              value={String(count)}
              onChange={(v) => setCount(Number(v))}
              options={[10, 20, 30, 50].map((n) => ({ value: String(n), label: `${n} การ์ด` }))}
            />
          </div>
        </div>

        <button
          onClick={loadCards}
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
          {loading ? "กำลังโหลด..." : "เริ่มเลย →"}
        </button>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>
        ไม่มีคำศัพท์ในหมวดนี้
        <br />
        <button
          onClick={() => setStarted(false)}
          style={{
            marginTop: "1rem",
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "0.5rem 1.5rem",
            cursor: "pointer",
          }}
        >
          กลับ
        </button>
      </div>
    );
  }

  if (!current) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
        <h2 style={{ fontSize: "1.6rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          ผ่านครบทุกใบแล้ว!
        </h2>
        <p style={{ color: "#94a3b8", marginBottom: "2rem" }}>
          ทบทวนครบ {cards.length} คำ
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <button
            onClick={() => { setIndex(0); setFlipped(false); }}
            style={{
              background: "#1e293b",
              color: "#e2e8f0",
              border: "1px solid var(--card-border)",
              borderRadius: 10,
              padding: "0.65rem 1.5rem",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            ทำซ้ำ
          </button>
          <button
            onClick={() => { setStarted(false); setCards([]); }}
            style={{
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "0.65rem 1.5rem",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            เริ่มใหม่
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", padding: "0 1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <button
          onClick={() => { setStarted(false); setCards([]); }}
          style={{
            background: "none",
            border: "none",
            color: "#64748b",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          ← กลับ
        </button>
        <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
          {index + 1} / {cards.length}
        </span>
      </div>

      {/* Progress bar */}
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

      {/* Flip card */}
      <div
        onClick={() => setFlipped((f) => !f)}
        style={{
          cursor: "pointer",
          perspective: 1000,
          marginBottom: "1.5rem",
          userSelect: "none",
        }}
      >
        <div
          style={{
            position: "relative",
            transformStyle: "preserve-3d",
            transition: "transform 0.45s ease",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            minHeight: 280,
          }}
        >
          {/* Front */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backfaceVisibility: "hidden",
              background: "var(--card)",
              border: "1px solid var(--card-border)",
              borderRadius: 20,
              padding: "2.5rem 2rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "1rem",
            }}
          >
            <Badge pos={current.partOfSpeech} />
            <span style={{ fontSize: "2.5rem", fontWeight: 800, color: "#e2e8f0", textAlign: "center" }}>
              {current.word}
            </span>
            {current.pronunciationThai && (
              <span style={{ color: "#38bdf8", fontSize: "1rem" }}>
                🔉 {current.pronunciationThai}
              </span>
            )}
            {current.ipa && (
              <span style={{ color: "#64748b", fontSize: "0.9rem", fontFamily: "monospace" }}>
                /{current.ipa}/
              </span>
            )}
            <span style={{ color: "#475569", fontSize: "0.8rem", marginTop: "0.5rem" }}>
              แตะเพื่อดูความหมาย
            </span>
          </div>

          {/* Back */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              background: "linear-gradient(135deg, #1e1b4b, #1a1a24)",
              border: "1px solid #4338ca55",
              borderRadius: 20,
              padding: "2.5rem 2rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "1rem",
            }}
          >
            <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#a78bfa" }}>
              {current.word}
            </span>
            <p style={{ fontSize: "1.3rem", fontWeight: 600, color: "#e2e8f0", textAlign: "center", lineHeight: 1.5 }}>
              {current.meaning}
            </p>
            {current.examples && current.examples.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", width: "100%" }}>
                {current.examples.map((ex) => (
                  <p key={ex.id} style={{ color: "#94a3b8", fontSize: "0.9rem", fontStyle: "italic", textAlign: "center", lineHeight: 1.5 }}>
                    &ldquo;{ex.sentence}&rdquo;
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          disabled={index === 0}
          onClick={() => { setIndex((i) => i - 1); setFlipped(false); }}
          style={{
            flex: 1,
            padding: "0.65rem",
            background: index === 0 ? "#1e293b" : "#334155",
            color: index === 0 ? "#475569" : "#e2e8f0",
            border: "none",
            borderRadius: 10,
            cursor: index === 0 ? "default" : "pointer",
            fontWeight: 600,
          }}
        >
          ← ก่อนหน้า
        </button>
        <button
          onClick={() => { setIndex((i) => i + 1); setFlipped(false); }}
          style={{
            flex: 1,
            padding: "0.65rem",
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {index + 1 >= cards.length ? "จบแล้ว 🎉" : "ถัดไป →"}
        </button>
      </div>
    </div>
  );
}
