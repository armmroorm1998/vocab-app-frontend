"use client";
import { useState, useEffect, useCallback } from "react";
import CustomSelect from "@/components/CustomSelect";
import api from "@/lib/api";
import {
  Vocabulary,
  EPartOfSpeech,
  POS_LABELS,
  POS_COLORS,
  VocabListResponse,
} from "@/types";

const ALL_POS = Object.values(EPartOfSpeech);

function Badge({ pos }: { pos: EPartOfSpeech }) {
  return (
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
      className={POS_COLORS[pos]}
    >
      {POS_LABELS[pos]}
    </span>
  );
}

function VocabCard({ v }: { v: Vocabulary }) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--card-border)",
        borderRadius: 14,
        padding: "1.25rem 1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "1.3rem", fontWeight: 700, color: "#e2e8f0" }}>
          {v.word}
        </span>
        <Badge pos={v.partOfSpeech} />
      </div>

      {(v.pronunciationThai || v.ipa) && (
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {v.pronunciationThai && (
            <span style={{ color: "#38bdf8", fontSize: "0.9rem" }}>
              🔉 {v.pronunciationThai}
            </span>
          )}
          {v.ipa && (
            <span style={{ color: "#94a3b8", fontSize: "0.85rem", fontFamily: "monospace" }}>
              /{v.ipa}/
            </span>
          )}
        </div>
      )}

      <p style={{ color: "#cbd5e1", fontSize: "0.95rem", lineHeight: 1.5 }}>
        {v.meaning}
      </p>

      {v.examples && v.examples.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {v.examples.map((ex) => (
            <p
              key={ex.id}
              style={{
                color: "#64748b",
                fontSize: "0.85rem",
                fontStyle: "italic",
                lineHeight: 1.5,
                borderLeft: "2px solid var(--card-border)",
                paddingLeft: "0.75rem",
              }}
            >
              {ex.sentence}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function VocabularyPage() {
  const [items, setItems] = useState<Vocabulary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [pos, setPos] = useState<EPartOfSpeech | "">("");
  const [loading, setLoading] = useState(false);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: LIMIT };
      if (search) params.search = search;
      if (pos) params.partOfSpeech = pos;
      const res = await api.get<VocabListResponse>("/vocabularies", { params });
      setItems(res.data.body);
      setTotal(res.data.total ?? 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, pos]);

  useEffect(() => { load(); }, [load]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        📖 คำศัพท์ทั้งหมด
      </h1>

      {/* Filters */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <input
          type="text"
          placeholder="ค้นหาคำศัพท์..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{
            flex: "1 1 220px",
            background: "var(--card)",
            border: "1px solid var(--card-border)",
            borderRadius: 8,
            padding: "0.6rem 1rem",
            color: "#e2e8f0",
            fontSize: "0.95rem",
            outline: "none",
          }}
        />
        <div style={{ flex: "0 0 180px" }}>
          <CustomSelect
            value={pos}
            onChange={(v) => { setPos(v as EPartOfSpeech | ""); setPage(1); }}
            options={[
              { value: "", label: "ทุก Part of Speech" },
              ...ALL_POS.map((p) => ({ value: p, label: POS_LABELS[p] })),
            ]}
          />
        </div>
      </div>

      {/* Count */}
      {!loading && (
        <p style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: "1rem" }}>
          พบ {total.toLocaleString()} คำ
        </p>
      )}

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
          กำลังโหลด...
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
          ไม่พบคำศัพท์
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          {items.map((v) => (
            <VocabCard key={v.id} v={v} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", justifyContent: "center" }}>
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            style={{
              padding: "0.5rem 1.2rem",
              borderRadius: 8,
              background: page === 1 ? "#1e293b" : "var(--accent)",
              color: page === 1 ? "#475569" : "#fff",
              border: "none",
              cursor: page === 1 ? "default" : "pointer",
              fontWeight: 600,
            }}
          >
            ← ก่อนหน้า
          </button>
          <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={{
              padding: "0.5rem 1.2rem",
              borderRadius: 8,
              background: page >= totalPages ? "#1e293b" : "var(--accent)",
              color: page >= totalPages ? "#475569" : "#fff",
              border: "none",
              cursor: page >= totalPages ? "default" : "pointer",
              fontWeight: 600,
            }}
          >
            ถัดไป →
          </button>
        </div>
      )}
    </div>
  );
}
