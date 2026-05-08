"use client";
import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { useSpeech } from "@/lib/useSpeech";

interface VerbFormResult {
  word: string;
  meaning: string;
  v2: string;
  v3: string;
}

interface BackendVerbForm {
  id: number;
  word: string;
  meaning: string;
  v2: string;
  v3: string;
}

interface VerbFormApiResponse {
  statusCode: number;
  success: boolean;
  total: number;
  body: BackendVerbForm[];
}

const LIMIT = 20;

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
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<VerbFormResult[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");

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

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await api.get<VerbFormApiResponse>("/verb-forms", {
        params: { page, limit: LIMIT },
      });
      const data = res.data;
      setResults(
        data.body.map((item) => ({
          word: item.word,
          meaning: item.meaning,
          v2: item.v2,
          v3: item.v3,
        })),
      );
      setTotal(data.total);
    } catch {
      setError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    }
  }, [page]);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  const totalPages = Math.ceil(total / LIMIT);

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
          คำกริยาทั้งหมดเรียงตาม A–Z พร้อม V1 / V2 / V3 และคำแปล
        </p>
      </div>

      {/* Info bar */}
      {total > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
            color: "#94a3b8",
            fontSize: "0.85rem",
          }}
        >
          <span>ทั้งหมด <strong style={{ color: "#e2e8f0" }}>{total}</strong> คำ</span>
          <span>หน้า <strong style={{ color: "#e2e8f0" }}>{page}</strong> / {totalPages}</span>
        </div>
      )}

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

      {/* Loading skeleton */}
      {loading && (
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--card-border)",
            borderRadius: 16,
            padding: "3rem",
            textAlign: "center",
            color: "#475569",
            fontSize: "0.95rem",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 18,
              height: 18,
              border: "2px solid #6366f1",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
              verticalAlign: "middle",
              marginRight: "0.5rem",
            }}
          />
          กำลังโหลด...
        </div>
      )}

      {/* Table */}
      {!loading && results.length > 0 && (
        <div className="vf-table">
          {/* Header — desktop only */}
          <div className="vf-header">
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
              className="vf-row"
              style={{
                borderBottom: i < results.length - 1 ? "1px solid var(--card-border)" : "none",
                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
              }}
            >
              {/* V1 + speaker (mobile: top row) */}
              <div className="vf-cell-v1">
                <span style={{ fontWeight: 700, color: "#e2e8f0", fontSize: "0.95rem" }}>
                  {r.word}
                </span>
                <span className="vf-speaker-mobile">
                  <SpeakerBtn
                    onClick={() => handleSpeak(r.word)}
                    active={speakingWord === r.word}
                  />
                </span>
              </div>

              {/* V2 */}
              <div className="vf-cell">
                <span className="vf-label">Past</span>
                <span style={{ color: "#86efac", fontWeight: 600, fontSize: "0.95rem" }}>
                  {r.v2}
                </span>
              </div>

              {/* V3 */}
              <div className="vf-cell">
                <span className="vf-label">P.P.</span>
                <span style={{ color: "#86efac", fontWeight: 600, fontSize: "0.95rem" }}>
                  {r.v3}
                </span>
              </div>

              {/* Meaning */}
              <div className="vf-cell vf-cell-meaning">
                <span className="vf-label">ความหมาย</span>
                <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{r.meaning}</span>
              </div>

              {/* Speaker — desktop only */}
              <div className="vf-cell vf-speaker-desktop">
                <SpeakerBtn
                  onClick={() => handleSpeak(r.word)}
                  active={speakingWord === r.word}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "0.5rem",
            marginTop: "1.5rem",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: 8,
              border: "1px solid var(--card-border)",
              background: "transparent",
              color: page === 1 ? "#334155" : "#94a3b8",
              cursor: page === 1 ? "not-allowed" : "pointer",
              fontSize: "0.85rem",
            }}
          >
            ← ก่อนหน้า
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | "...")[]>((acc, p, idx, arr) => {
              if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
              acc.push(p);
              return acc;
            }, [])
            .map((item, idx) =>
              item === "..." ? (
                <span key={`ellipsis-${idx}`} style={{ color: "#475569", padding: "0 0.25rem" }}>
                  …
                </span>
              ) : (
                <button
                  key={item}
                  onClick={() => setPage(item as number)}
                  disabled={loading}
                  style={{
                    padding: "0.4rem 0.75rem",
                    borderRadius: 8,
                    border: "1px solid",
                    borderColor: page === item ? "var(--accent)" : "var(--card-border)",
                    background: page === item ? "var(--accent)" : "transparent",
                    color: page === item ? "#fff" : "#94a3b8",
                    fontWeight: page === item ? 700 : 400,
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    minWidth: 36,
                  }}
                >
                  {item}
                </button>
              ),
            )}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: 8,
              border: "1px solid var(--card-border)",
              background: "transparent",
              color: page === totalPages ? "#334155" : "#94a3b8",
              cursor: page === totalPages ? "not-allowed" : "pointer",
              fontSize: "0.85rem",
            }}
          >
            ถัดไป →
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .vf-table {
          background: var(--card);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          overflow: hidden;
        }
        .vf-header {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr 44px;
          padding: 0.75rem 1.25rem;
          background: rgba(99,102,241,0.1);
          border-bottom: 1px solid var(--card-border);
          gap: 0.5rem;
        }
        .vf-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr 44px;
          padding: 0.85rem 1.25rem;
          align-items: center;
          gap: 0.5rem;
        }
        .vf-cell { display: contents; }
        .vf-cell-v1 { display: contents; }
        .vf-label { display: none; }
        .vf-speaker-mobile { display: none; }
        .vf-speaker-desktop { display: flex; align-items: center; }

        @media (max-width: 600px) {
          .vf-header { display: none; }
          .vf-row {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            padding: 0.9rem 1rem;
            gap: 0;
          }
          .vf-cell-v1 {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 0.5rem;
          }
          .vf-cell {
            display: flex;
            align-items: baseline;
            gap: 0.5rem;
            margin-bottom: 0.2rem;
          }
          .vf-cell-meaning { margin-top: 0.15rem; }
          .vf-label {
            display: inline-block;
            font-size: 0.65rem;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            min-width: 40px;
          }
          .vf-speaker-mobile { display: flex; align-items: center; }
          .vf-speaker-desktop { display: none; }
        }
      `}</style>
    </div>
  );
}
