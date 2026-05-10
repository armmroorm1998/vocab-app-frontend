"use client";
import { useState, useEffect, useCallback } from "react";
import CustomSelect from "@/components/CustomSelect";
import api from "@/lib/api";
import { useSpeech } from "@/lib/useSpeech";
import {
  Vocabulary,
  Category,
  ECefrLevel,
  EPartOfSpeech,
  POS_LABELS,
  POS_COLORS,
  VocabListResponse,
  ApiResponse,
} from "@/types";

const ALL_CEFR = Object.values(ECefrLevel);
const CEFR_COLORS: Record<ECefrLevel, string> = {
  [ECefrLevel.A1]: "#4ade80",
  [ECefrLevel.A2]: "#86efac",
  [ECefrLevel.B1]: "#60a5fa",
  [ECefrLevel.B2]: "#818cf8",
  [ECefrLevel.C1]: "#f472b6",
  [ECefrLevel.C2]: "#fb7185",
};

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

function SpeakerIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      width="16"
      height="16"
    >
      {active ? (
        // speaker with sound waves
        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
      ) : (
        // speaker only (muted / idle)
        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM17.78 9.22a.75.75 0 1 0-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L19.5 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L20.56 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L19.5 10.94l-1.72-1.72Z" />
      )}
    </svg>
  );
}

function VocabCard({
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
        {v.cefrLevel && (
          <span
            style={{
              display: "inline-block",
              padding: "0.1rem 0.45rem",
              borderRadius: 5,
              fontSize: "0.7rem",
              fontWeight: 700,
              background: `${CEFR_COLORS[v.cefrLevel]}22`,
              color: CEFR_COLORS[v.cefrLevel],
              border: `1px solid ${CEFR_COLORS[v.cefrLevel]}55`,
            }}
          >
            {v.cefrLevel}
          </span>
        )}
        <button
          onClick={() => onSpeak(v.word)}
          title={`ออกเสียง "${v.word}"`}
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 30,
            height: 30,
            borderRadius: 8,
            border: "1px solid var(--card-border)",
            background: isSpeaking ? "var(--accent)" : "transparent",
            color: isSpeaking ? "#fff" : "#94a3b8",
            cursor: "pointer",
            transition: "all 0.15s",
            flexShrink: 0,
          }}
        >
          <SpeakerIcon active={isSpeaking} />
        </button>
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
  const { speak, speaking, cancel } = useSpeech();
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Vocabulary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [cefrLevel, setCefrLevel] = useState<ECefrLevel | "">("");
  const [loading, setLoading] = useState(false);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: LIMIT };
      if (search) params.search = search;
      if (cefrLevel) params.cefrLevel = cefrLevel;
      if (categoryId) params.categoryId = categoryId;
      const res = await api.get<VocabListResponse>("/vocabularies", { params });
      setItems(res.data.body);
      setTotal(res.data.total ?? 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, cefrLevel, categoryId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  // Load categories once
  const loadCategories = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<Category[]>>("/categories");
      setCategories(res.data.body);
    } catch {
      // ignore
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadCategories(); }, [loadCategories]);

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
            value={cefrLevel}
            onChange={(v) => { setCefrLevel(v as ECefrLevel | ""); setPage(1); }}
            options={[
              { value: "", label: "ทุกระดับ CEFR" },
              ...ALL_CEFR.map((l) => ({ value: l, label: l })),
            ]}
          />
        </div>
        {categories.length > 0 && (
          <div style={{ flex: "0 0 180px" }}>
            <CustomSelect
              value={String(categoryId)}
              onChange={(v) => { setCategoryId(v === "" ? "" : Number(v)); setPage(1); }}
              options={[
                { value: "", label: "ทุกหมวดหมู่" },
                ...categories.map((c) => ({ value: String(c.id), label: c.nameTh ?? c.name })),
              ]}
            />
          </div>
        )}
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
            <VocabCard
              key={v.id}
              v={v}
              isSpeaking={speaking && speakingId === v.id}
              onSpeak={(word) => {
                if (speaking && speakingId === v.id) {
                  cancel();
                  setSpeakingId(null);
                } else {
                  setSpeakingId(v.id);
                  speak(word);
                }
              }}
            />
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
