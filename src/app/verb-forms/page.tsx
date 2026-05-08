"use client";
import { useState } from "react";
import api from "@/lib/api";
import { useSpeech } from "@/lib/useSpeech";

interface VerbFormResult {
  word: string;
  meaning: string;
  v2: string;
  v3: string;
  type: "regular" | "irregular";
}

interface BackendVerbForm {
  id: number;
  word: string;
  meaning: string;
  v2: string;
  v3: string;
  verbType: string;
}

interface VerbFormApiResponse {
  statusCode: number;
  success: boolean;
  total: number;
  seededTotal: number;
  body: BackendVerbForm[];
}

const COUNT_OPTIONS = [5, 10, 15, 20];

function SpeakerBtn({ onClick, active }: { onClick: () => void; active: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        color: active ? "var(--accent-hover)" : "#475569",
        padding: "0 4px",
        display: "flex",
        alignItems: "center",
      }}
      title="ออกเสียง"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
      </svg>
    </button>
  );
}

export default function VerbFormsPage() {
  const { speak, speaking, cancel } = useSpeech();
  const [speakingWord, setSpeakingWord] = useState<string | null>(null);
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<VerbFormResult[]>([]);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);

  // Sync speak state
  if (speakingWord && !speaking) {
    setSpeakingWord(null);
  }

  const handleSpeak = (word: string) => {
    if (speakingWord === word) {
      cancel();
      setSpeakingWord(null);
    } else {
      speak(word);
      setSpeakingWord(word);
    }
  };

  const generate = async () => {
    setLoading(true);
    setError("");
    setResults([]);
    try {
      const res = await api.get<VerbFormApiResponse>("/verb-forms/random", {
        params: { limit: count },
      });
      const data = res.data;

      if (data.seededTotal === 0) {
        setError("ยังไม่มีข้อมูลในฐานข้อมูล กรุณารัน: npm run seed:verb-forms ใน backend ก่อน");
        return;
      }

      if (!data.body || data.body.length === 0) {
        setError("ไม่พบข้อมูล กรุณาลองใหม่");
        return;
      }

      setResults(
        data.body.map((item) => ({
          word: item.word,
          meaning: item.meaning,
          v2: item.v2,
          v3: item.v3,
          type: item.verbType as "regular" | "irregular",
        })),
      );
      setStarted(true);
    } catch {
      setError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  const irregular = results.filter((r) => r.type === "irregular");
  const regular = results.filter((r) => r.type === "regular");

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1
          style={{
            fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
            fontWeight: 800,
            marginBottom: "0.5rem",
          }}
        >
          📋 Verb 3 ช่อง
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "1rem", lineHeight: 1.6 }}>
          สุ่มคำกริยาจากคลัง แล้วดู V1 / V2 / V3 พร้อมคำแปล
        </p>
      </div>

      {/* Setup */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--card-border)",
          borderRadius: 16,
          padding: "1.25rem 1.5rem",
          marginBottom: "1.25rem",
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "0.9rem" }}>
          จำนวนคำ:
        </span>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          {COUNT_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => setCount(n)}
              style={{
                padding: "0.3rem 0.75rem",
                borderRadius: 8,
                border: "1px solid",
                borderColor: count === n ? "var(--accent)" : "var(--card-border)",
                background: count === n ? "var(--accent)" : "transparent",
                color: count === n ? "#fff" : "#94a3b8",
                fontWeight: count === n ? 700 : 400,
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {n}
            </button>
          ))}
        </div>

        <button
          onClick={generate}
          disabled={loading}
          style={{
            marginLeft: "auto",
            padding: "0.5rem 1.25rem",
            borderRadius: 10,
            background: loading ? "#1e293b" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
            color: loading ? "#475569" : "#fff",
            fontWeight: 700,
            fontSize: "0.9rem",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            transition: "all 0.15s",
          }}
        >
          {loading ? (
            <>
              <span
                style={{
                  display: "inline-block",
                  width: 14,
                  height: 14,
                  border: "2px solid #6366f1",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                }}
              />
              กำลังโหลด...
            </>
          ) : (
            <>🔀 {started ? "สุ่มใหม่" : "เริ่มเลย"}</>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 12,
            padding: "1rem 1.25rem",
            color: "#fca5a5",
            fontSize: "0.9rem",
            marginBottom: "1.25rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <>
          {/* Stats */}
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            <span
              style={{
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 8,
                padding: "0.3rem 0.85rem",
                color: "#fca5a5",
                fontSize: "0.82rem",
                fontWeight: 600,
              }}
            >
              ⚡ Irregular: {irregular.length} คำ
            </span>
            <span
              style={{
                background: "rgba(34,211,238,0.1)",
                border: "1px solid rgba(34,211,238,0.25)",
                borderRadius: 8,
                padding: "0.3rem 0.85rem",
                color: "#67e8f9",
                fontSize: "0.82rem",
                fontWeight: 600,
              }}
            >
              ✅ Regular: {regular.length} คำ
            </span>
          </div>

          {/* Table */}
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--card-border)",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr 80px",
                padding: "0.75rem 1.25rem",
                background: "rgba(99,102,241,0.1)",
                borderBottom: "1px solid var(--card-border)",
                gap: "0.5rem",
              }}
            >
              {["V1 (Base)", "V2 (Past)", "V3 (P.P.)", "ความหมาย", ""].map((h) => (
                <span
                  key={h}
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            {results.map((r, i) => (
              <div
                key={r.word}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr 80px",
                  padding: "0.85rem 1.25rem",
                  borderBottom: i < results.length - 1 ? "1px solid var(--card-border)" : "none",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                }}
              >
                {/* V1 */}
                <span style={{ fontWeight: 700, color: "#e2e8f0", fontSize: "0.95rem" }}>
                  {r.word}
                </span>

                {/* V2 */}
                <span
                  style={{
                    color: r.type === "irregular" ? "#fca5a5" : "#86efac",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                  }}
                >
                  {r.v2}
                </span>

                {/* V3 */}
                <span
                  style={{
                    color: r.type === "irregular" ? "#fca5a5" : "#86efac",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                  }}
                >
                  {r.v3}
                </span>

                {/* Meaning */}
                <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{r.meaning}</span>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <SpeakerBtn
                    onClick={() => handleSpeak(r.word)}
                    active={speakingWord === r.word}
                  />
                  <span
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      padding: "0.1rem 0.4rem",
                      borderRadius: 4,
                      background:
                        r.type === "irregular"
                          ? "rgba(239,68,68,0.15)"
                          : "rgba(34,211,238,0.1)",
                      color: r.type === "irregular" ? "#fca5a5" : "#67e8f9",
                      border: `1px solid ${r.type === "irregular" ? "rgba(239,68,68,0.3)" : "rgba(34,211,238,0.25)"}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.type === "irregular" ? "irreg." : "reg."}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p style={{ color: "#475569", fontSize: "0.78rem", marginTop: "0.75rem", textAlign: "center" }}>
            🔴 แดง = Irregular &nbsp;|&nbsp; 🟢 เขียว = Regular
          </p>
        </>
      )}

      {!started && !loading && (
        <div
          style={{
            textAlign: "center",
            color: "#475569",
            padding: "3rem 0",
            fontSize: "0.95rem",
          }}
        >
          กด <strong style={{ color: "#94a3b8" }}>เริ่มเลย</strong> เพื่อสุ่มคำกริยาจากคลัง
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
