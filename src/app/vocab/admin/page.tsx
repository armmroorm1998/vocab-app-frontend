"use client";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import api from "@/lib/api";
import CustomSelect from "@/components/CustomSelect";
import {
  ApiResponse,
  UserProfile,
  Vocabulary,
  VocabListResponse,
  Category,
  EPartOfSpeech,
  ECefrLevel,
  AdminUser,
  AdminUserListResponse,
  RUNNABLE_SCRIPTS,
  RunnableScript,
  RunScriptResult,
  ConversationQuizCategory,
  ConversationQuizCategoryResponse,
  ConversationQuizQuestion,
  ConversationQuizResponse,
  ListeningLessonSummary,
  ListeningLessonsResponse,
  ListeningUnitSummary,
  ListeningUnitsResponse,
  ListeningUnitDetail,
  ListeningUnitDetailResponse,
} from "@/types";

const cardStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--card-border)",
  borderRadius: 12,
  padding: "1.25rem",
};

const inputStyle: React.CSSProperties = {
  background: "#0f0f13",
  border: "1px solid var(--card-border)",
  borderRadius: 8,
  padding: "0.55rem 0.75rem",
  color: "#e2e8f0",
  fontSize: "0.9rem",
  outline: "none",
};

const btnStyle = (variant: "primary" | "danger" | "ghost" = "primary"): React.CSSProperties => ({
  padding: "0.5rem 1rem",
  borderRadius: 8,
  border: variant === "ghost" ? "1px solid var(--card-border)" : "none",
  background: variant === "primary" ? "var(--accent)" : variant === "danger" ? "#e11d48" : "transparent",
  color: variant === "ghost" ? "#94a3b8" : "#fff",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "0.85rem",
  whiteSpace: "nowrap",
});

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0.5rem 0.6rem",
  color: "#64748b",
  fontSize: "0.75rem",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  borderBottom: "1px solid var(--card-border)",
};

const tdStyle: React.CSSProperties = {
  padding: "0.6rem",
  borderBottom: "1px solid var(--card-border)",
  fontSize: "0.85rem",
  color: "#cbd5e1",
  verticalAlign: "top",
};

function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.message) {
    const msg = err.response.data.message;
    return Array.isArray(msg) ? msg.join(", ") : msg;
  }
  return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
}

const TABS = ["คำศัพท์", "หมวดหมู่", "บทสนทนา", "Listening", "Scripts", "ผู้ใช้งาน"] as const;
type Tab = (typeof TABS)[number];

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<Tab>("คำศัพท์");

  const checkAccess = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<UserProfile>>("/user/me");
      setIsAdmin(res.data.body.isAdmin);
    } catch {
      setIsAdmin(false);
    } finally {
      setChecking(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { checkAccess(); }, [checkAccess]);

  if (checking) {
    return <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>กำลังตรวจสอบสิทธิ์...</div>;
  }

  if (!isAdmin) {
    return (
      <div style={{ maxWidth: 500, margin: "3rem auto", textAlign: "center", ...cardStyle }}>
        <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "#f87171", marginBottom: "0.5rem" }}>
          🔒 ไม่มีสิทธิ์เข้าถึงหน้านี้
        </p>
        <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "1.5rem" }}>🛠️ Admin</h1>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "0.55rem 1.1rem",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.9rem",
              background: tab === t ? "var(--accent)" : "var(--card)",
              color: tab === t ? "#fff" : "#94a3b8",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "คำศัพท์" && <VocabTab />}
      {tab === "หมวดหมู่" && <CategoryTab />}
      {tab === "บทสนทนา" && <ConversationQuizTab />}
      {tab === "Listening" && <ListeningTab />}
      {tab === "Scripts" && <ScriptsTab />}
      {tab === "ผู้ใช้งาน" && <UsersTab />}
    </div>
  );
}

// ─── Vocabulary tab ──────────────────────────────────────────────────────────

const EMPTY_VOCAB_FORM = {
  word: "",
  meaning: "",
  pronunciationThai: "",
  ipa: "",
  partOfSpeech: EPartOfSpeech.OTHER as EPartOfSpeech,
  cefrLevel: "" as ECefrLevel | "",
  categoryId: "" as number | "",
  examples: "",
};

function VocabTab() {
  const [items, setItems] = useState<Vocabulary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_VOCAB_FORM);
  const [showForm, setShowForm] = useState(false);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: LIMIT };
      if (search) params.search = search;
      const res = await api.get<VocabListResponse>("/vocabularies", { params });
      setItems(res.data.body);
      setTotal(res.data.total ?? 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get<ApiResponse<Category[]>>("/categories").then((res) => setCategories(res.data.body)).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_VOCAB_FORM);
    setShowForm(true);
    setError(null);
  };

  const openEdit = (v: Vocabulary) => {
    setEditingId(v.id);
    setForm({
      word: v.word,
      meaning: v.meaning,
      pronunciationThai: v.pronunciationThai ?? "",
      ipa: v.ipa ?? "",
      partOfSpeech: v.partOfSpeech,
      cefrLevel: v.cefrLevel ?? "",
      categoryId: v.category?.id ?? "",
      examples: (v.examples ?? []).map((e) => e.sentence).join("\n"),
    });
    setShowForm(true);
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);
    const payload = {
      word: form.word.trim(),
      meaning: form.meaning.trim(),
      pronunciationThai: form.pronunciationThai.trim() || undefined,
      ipa: form.ipa.trim() || undefined,
      partOfSpeech: form.partOfSpeech,
      cefrLevel: form.cefrLevel || null,
      categoryId: form.categoryId === "" ? null : Number(form.categoryId),
      examples: form.examples
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    try {
      if (editingId) {
        await api.put(`/vocabularies/${editingId}`, payload);
      } else {
        await api.post("/vocabularies", payload);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("ยืนยันลบคำศัพท์นี้?")) return;
    try {
      await api.delete(`/vocabularies/${id}`);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <input
          placeholder="ค้นหาคำศัพท์..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ ...inputStyle, flex: "1 1 220px" }}
        />
        <button onClick={openCreate} style={btnStyle("primary")}>+ เพิ่มคำศัพท์</button>
      </div>

      {showForm && (
        <div style={cardStyle}>
          <h3 style={{ marginBottom: "0.75rem", fontWeight: 700 }}>{editingId ? "แก้ไขคำศัพท์" : "เพิ่มคำศัพท์ใหม่"}</h3>
          {error && <p style={{ color: "#f87171", fontSize: "0.85rem", marginBottom: "0.5rem" }}>{error}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <input placeholder="word" value={form.word} onChange={(e) => setForm({ ...form, word: e.target.value })} style={inputStyle} />
            <input placeholder="meaning (ไทย)" value={form.meaning} onChange={(e) => setForm({ ...form, meaning: e.target.value })} style={inputStyle} />
            <input placeholder="pronunciation (ไทย)" value={form.pronunciationThai} onChange={(e) => setForm({ ...form, pronunciationThai: e.target.value })} style={inputStyle} />
            <input placeholder="IPA" value={form.ipa} onChange={(e) => setForm({ ...form, ipa: e.target.value })} style={inputStyle} />
            <CustomSelect
              value={form.partOfSpeech}
              onChange={(v) => setForm({ ...form, partOfSpeech: v as EPartOfSpeech })}
              options={Object.values(EPartOfSpeech).map((p) => ({ value: p, label: p }))}
            />
            <CustomSelect
              value={form.cefrLevel}
              onChange={(v) => setForm({ ...form, cefrLevel: v as ECefrLevel | "" })}
              options={[{ value: "", label: "ไม่ระบุระดับ" }, ...Object.values(ECefrLevel).map((l) => ({ value: l, label: l }))]}
            />
            <CustomSelect
              value={String(form.categoryId)}
              onChange={(v) => setForm({ ...form, categoryId: v === "" ? "" : Number(v) })}
              options={[{ value: "", label: "ไม่ระบุหมวดหมู่" }, ...categories.map((c) => ({ value: String(c.id), label: c.nameTh ?? c.name }))]}
            />
          </div>
          <textarea
            placeholder="ตัวอย่างประโยค (บรรทัดละ 1 ประโยค)"
            value={form.examples}
            onChange={(e) => setForm({ ...form, examples: e.target.value })}
            rows={3}
            style={{ ...inputStyle, width: "100%", marginBottom: "0.75rem", resize: "vertical" }}
          />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={handleSubmit} style={btnStyle("primary")}>{editingId ? "บันทึก" : "เพิ่ม"}</button>
            <button onClick={() => setShowForm(false)} style={btnStyle("ghost")}>ยกเลิก</button>
          </div>
        </div>
      )}

      <div style={{ ...cardStyle, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Word</th>
              <th style={thStyle}>Meaning</th>
              <th style={thStyle}>POS</th>
              <th style={thStyle}>CEFR</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td style={tdStyle} colSpan={6}>กำลังโหลด...</td></tr>
            ) : items.length === 0 ? (
              <tr><td style={tdStyle} colSpan={6}>ไม่พบคำศัพท์</td></tr>
            ) : (
              items.map((v) => (
                <tr key={v.id}>
                  <td style={{ ...tdStyle, fontWeight: 700, color: "#e2e8f0" }}>{v.word}</td>
                  <td style={tdStyle}>{v.meaning}</td>
                  <td style={tdStyle}>{v.partOfSpeech}</td>
                  <td style={tdStyle}>{v.cefrLevel ?? "-"}</td>
                  <td style={tdStyle}>{v.category?.nameTh ?? v.category?.name ?? "-"}</td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button onClick={() => openEdit(v)} style={btnStyle("ghost")}>แก้ไข</button>
                      <button onClick={() => handleDelete(v.id)} style={btnStyle("danger")}>ลบ</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", alignItems: "center" }}>
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} style={btnStyle("ghost")}>← ก่อนหน้า</button>
          <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={btnStyle("ghost")}>ถัดไป →</button>
        </div>
      )}
    </div>
  );
}

// ─── Category tab ────────────────────────────────────────────────────────────

function CategoryTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [nameTh, setNameTh] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<Category[]>>("/categories");
      setCategories(res.data.body);
    } catch {
      setCategories([]);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setNameTh("");
  };

  const handleSubmit = async () => {
    setError(null);
    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, { name, nameTh: nameTh || null });
      } else {
        await api.post("/categories", { name, nameTh: nameTh || undefined });
      }
      resetForm();
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("ยืนยันลบหมวดหมู่นี้?")) return;
    try {
      await api.delete(`/categories/${id}`);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={cardStyle}>
        <h3 style={{ marginBottom: "0.75rem", fontWeight: 700 }}>{editingId ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่"}</h3>
        {error && <p style={{ color: "#f87171", fontSize: "0.85rem", marginBottom: "0.5rem" }}>{error}</p>}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <input placeholder="name (English)" value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, flex: "1 1 200px" }} />
          <input placeholder="ชื่อภาษาไทย" value={nameTh} onChange={(e) => setNameTh(e.target.value)} style={{ ...inputStyle, flex: "1 1 200px" }} />
          <button onClick={handleSubmit} style={btnStyle("primary")}>{editingId ? "บันทึก" : "เพิ่ม"}</button>
          {editingId && <button onClick={resetForm} style={btnStyle("ghost")}>ยกเลิก</button>}
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>ชื่อไทย</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td style={{ ...tdStyle, fontWeight: 700, color: "#e2e8f0" }}>{c.name}</td>
                <td style={tdStyle}>{c.nameTh ?? "-"}</td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button
                      onClick={() => { setEditingId(c.id); setName(c.name); setNameTh(c.nameTh ?? ""); }}
                      style={btnStyle("ghost")}
                    >
                      แก้ไข
                    </button>
                    <button onClick={() => handleDelete(c.id)} style={btnStyle("danger")}>ลบ</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Conversation Quiz tab ───────────────────────────────────────────────────

const EMPTY_CATEGORY_FORM = { key: "", name: "", emoji: "", displayOrder: "" as number | "" };
const EMPTY_QUESTION_FORM = {
  speaker: "",
  prompt: "",
  choices: "",
  correctAnswer: "",
  naturalAnswer: "",
  dialogueLines: "",
  orderIndex: "" as number | "",
};

function parseLines(text: string): string[] {
  return text.split("\n").map((s) => s.trim()).filter(Boolean);
}

function parseDialogueLines(text: string): { speaker: string; text: string }[] {
  return parseLines(text).map((line) => {
    const idx = line.indexOf(":");
    if (idx === -1) return { speaker: "Speaker", text: line };
    return { speaker: line.slice(0, idx).trim(), text: line.slice(idx + 1).trim() };
  });
}

function formatDialogueLines(lines: { speaker: string; text: string }[] | undefined): string {
  return (lines ?? []).map((l) => `${l.speaker}: ${l.text}`).join("\n");
}

function ConversationQuizTab() {
  const [categories, setCategories] = useState<ConversationQuizCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<ConversationQuizQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [catForm, setCatForm] = useState(EMPTY_CATEGORY_FORM);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);

  const [qForm, setQForm] = useState(EMPTY_QUESTION_FORM);
  const [editingQId, setEditingQId] = useState<number | null>(null);
  const [showQForm, setShowQForm] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const res = await api.get<ConversationQuizCategoryResponse>("/conversation-quiz/categories");
      setCategories(res.data.body);
    } catch {
      setCategories([]);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadCategories(); }, [loadCategories]);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null;

  const loadQuestions = useCallback(async (categoryKey: string) => {
    try {
      const res = await api.get<ConversationQuizResponse>("/conversation-quiz/questions", { params: { categoryKey } });
      setQuestions(res.data.body);
    } catch {
      setQuestions([]);
    }
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadQuestions(selectedCategory.key);
    } else {
      setQuestions([]);
    }
  }, [selectedCategory, loadQuestions]);

  const resetCatForm = () => { setEditingCatId(null); setCatForm(EMPTY_CATEGORY_FORM); };

  const handleCatSubmit = async () => {
    setError(null);
    try {
      if (editingCatId) {
        await api.put(`/conversation-quiz/categories/${editingCatId}`, {
          name: catForm.name,
          emoji: catForm.emoji || undefined,
          displayOrder: catForm.displayOrder === "" ? undefined : Number(catForm.displayOrder),
        });
      } else {
        await api.post("/conversation-quiz/categories", {
          key: catForm.key,
          name: catForm.name,
          emoji: catForm.emoji || undefined,
          displayOrder: catForm.displayOrder === "" ? undefined : Number(catForm.displayOrder),
        });
      }
      resetCatForm();
      void loadCategories();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const handleCatDelete = async (id: number) => {
    if (!confirm("ยืนยันลบหมวดนี้? คำถามทั้งหมดในหมวดจะถูกลบไปด้วย")) return;
    try {
      await api.delete(`/conversation-quiz/categories/${id}`);
      if (selectedCategoryId === id) setSelectedCategoryId(null);
      void loadCategories();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const resetQForm = () => {
    setEditingQId(null);
    setQForm(EMPTY_QUESTION_FORM);
    setShowQForm(false);
  };

  const startEditQuestion = (q: ConversationQuizQuestion) => {
    setEditingQId(q.id);
    setQForm({
      speaker: q.speaker,
      prompt: q.prompt,
      choices: q.choices.join("\n"),
      correctAnswer: q.correctAnswer,
      naturalAnswer: q.naturalAnswer,
      dialogueLines: formatDialogueLines(q.dialogueLines),
      orderIndex: q.orderIndex,
    });
    setShowQForm(true);
  };

  const handleQSubmit = async () => {
    if (!selectedCategory) return;
    setError(null);
    try {
      const payload = {
        categoryId: selectedCategory.id,
        speaker: qForm.speaker || undefined,
        prompt: qForm.prompt,
        choices: parseLines(qForm.choices),
        correctAnswer: qForm.correctAnswer,
        naturalAnswer: qForm.naturalAnswer,
        dialogueLines: qForm.dialogueLines.trim() ? parseDialogueLines(qForm.dialogueLines) : undefined,
        orderIndex: qForm.orderIndex === "" ? undefined : Number(qForm.orderIndex),
      };
      if (editingQId) {
        await api.put(`/conversation-quiz/questions/${editingQId}`, payload);
      } else {
        await api.post("/conversation-quiz/questions", payload);
      }
      resetQForm();
      void loadQuestions(selectedCategory.key);
      void loadCategories();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const handleQDelete = async (id: number) => {
    if (!confirm("ยืนยันลบคำถามนี้?")) return;
    try {
      await api.delete(`/conversation-quiz/questions/${id}`);
      if (selectedCategory) void loadQuestions(selectedCategory.key);
      void loadCategories();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {error && <p style={{ color: "#f87171", fontSize: "0.85rem" }}>{error}</p>}

      <div style={cardStyle}>
        <h3 style={{ marginBottom: "0.75rem", fontWeight: 700 }}>{editingCatId ? "แก้ไขหมวดบทสนทนา" : "เพิ่มหมวดบทสนทนา"}</h3>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {!editingCatId && (
            <input placeholder="key (เช่น job-interview)" value={catForm.key} onChange={(e) => setCatForm({ ...catForm, key: e.target.value })} style={{ ...inputStyle, flex: "1 1 160px" }} />
          )}
          <input placeholder="ชื่อหมวด" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} style={{ ...inputStyle, flex: "1 1 160px" }} />
          <input placeholder="emoji" value={catForm.emoji} onChange={(e) => setCatForm({ ...catForm, emoji: e.target.value })} style={{ ...inputStyle, width: 80 }} />
          <input placeholder="ลำดับ" type="number" value={catForm.displayOrder} onChange={(e) => setCatForm({ ...catForm, displayOrder: e.target.value === "" ? "" : Number(e.target.value) })} style={{ ...inputStyle, width: 90 }} />
          <button onClick={handleCatSubmit} style={btnStyle("primary")}>{editingCatId ? "บันทึก" : "เพิ่ม"}</button>
          {editingCatId && <button onClick={resetCatForm} style={btnStyle("ghost")}>ยกเลิก</button>}
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>หมวด</th>
              <th style={thStyle}>Key</th>
              <th style={thStyle}>คำถาม</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} style={{ background: selectedCategoryId === c.id ? "rgba(99,102,241,0.08)" : undefined }}>
                <td style={{ ...tdStyle, fontWeight: 700, color: "#e2e8f0", cursor: "pointer" }} onClick={() => setSelectedCategoryId(c.id)}>
                  {c.emoji ?? "💬"} {c.name}
                </td>
                <td style={tdStyle}>{c.key}</td>
                <td style={tdStyle}>{c.totalQuestions}</td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button onClick={() => setSelectedCategoryId(c.id)} style={btnStyle("ghost")}>จัดการคำถาม</button>
                    <button
                      onClick={() => { setEditingCatId(c.id); setCatForm({ key: c.key, name: c.name, emoji: c.emoji ?? "", displayOrder: c.displayOrder }); }}
                      style={btnStyle("ghost")}
                    >
                      แก้ไข
                    </button>
                    <button onClick={() => handleCatDelete(c.id)} style={btnStyle("danger")}>ลบ</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedCategory && (
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h3 style={{ fontWeight: 700 }}>คำถามในหมวด: {selectedCategory.emoji ?? "💬"} {selectedCategory.name}</h3>
            {!showQForm && (
              <button onClick={() => { resetQForm(); setShowQForm(true); }} style={btnStyle("primary")}>+ เพิ่มคำถาม</button>
            )}
          </div>

          {showQForm && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1rem", padding: "0.9rem", border: "1px solid var(--card-border)", borderRadius: 8 }}>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                <input placeholder="speaker" value={qForm.speaker} onChange={(e) => setQForm({ ...qForm, speaker: e.target.value })} style={{ ...inputStyle, flex: "1 1 140px" }} />
                <input placeholder="ลำดับ" type="number" value={qForm.orderIndex} onChange={(e) => setQForm({ ...qForm, orderIndex: e.target.value === "" ? "" : Number(e.target.value) })} style={{ ...inputStyle, width: 90 }} />
              </div>
              <input placeholder="prompt (คำถาม)" value={qForm.prompt} onChange={(e) => setQForm({ ...qForm, prompt: e.target.value })} style={inputStyle} />
              <textarea placeholder="choices (บรรทัดละ 1 ตัวเลือก)" value={qForm.choices} onChange={(e) => setQForm({ ...qForm, choices: e.target.value })} rows={4} style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }} />
              <input placeholder="correctAnswer (ต้องตรงกับหนึ่งใน choices)" value={qForm.correctAnswer} onChange={(e) => setQForm({ ...qForm, correctAnswer: e.target.value })} style={inputStyle} />
              <input placeholder="naturalAnswer" value={qForm.naturalAnswer} onChange={(e) => setQForm({ ...qForm, naturalAnswer: e.target.value })} style={inputStyle} />
              <textarea
                placeholder={"dialogueLines (บรรทัดละ 1 บท รูปแบบ Speaker: ข้อความ) — เว้นว่างได้"}
                value={qForm.dialogueLines}
                onChange={(e) => setQForm({ ...qForm, dialogueLines: e.target.value })}
                rows={4}
                style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }}
              />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={handleQSubmit} style={btnStyle("primary")}>{editingQId ? "บันทึก" : "เพิ่มคำถาม"}</button>
                <button onClick={resetQForm} style={btnStyle("ghost")}>ยกเลิก</button>
              </div>
            </div>
          )}

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Speaker</th>
                  <th style={thStyle}>Prompt</th>
                  <th style={thStyle}>Correct Answer</th>
                  <th style={thStyle}>ลำดับ</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr key={q.id}>
                    <td style={tdStyle}>{q.speaker}</td>
                    <td style={tdStyle}>{q.prompt}</td>
                    <td style={tdStyle}>{q.correctAnswer}</td>
                    <td style={tdStyle}>{q.orderIndex}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <button onClick={() => startEditQuestion(q)} style={btnStyle("ghost")}>แก้ไข</button>
                        <button onClick={() => handleQDelete(q.id)} style={btnStyle("danger")}>ลบ</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Listening tab ───────────────────────────────────────────────────────────

const EMPTY_LESSON_FORM = { key: "", title: "", emoji: "", displayOrder: "" as number | "" };
const EMPTY_UNIT_FORM = {
  key: "",
  title: "",
  emoji: "",
  displayOrder: "" as number | "",
  videoId: "",
  startSeconds: "" as number | "",
  endSeconds: "" as number | "",
  linesText: "",
};

function parseUnitLines(text: string): { speaker: string; textEn: string; textTh?: string }[] {
  return parseLines(text).map((line) => {
    const parts = line.split("|").map((p) => p.trim());
    return {
      speaker: parts[0] ?? "Speaker",
      textEn: parts[1] ?? "",
      textTh: parts[2] || undefined,
    };
  });
}

function formatUnitLines(lines: { speaker: string; textEn: string; textTh: string | null }[]): string {
  return lines.map((l) => `${l.speaker} | ${l.textEn} | ${l.textTh ?? ""}`).join("\n");
}

function ListeningTab() {
  const [lessons, setLessons] = useState<ListeningLessonSummary[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [units, setUnits] = useState<ListeningUnitSummary[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [unitDetail, setUnitDetail] = useState<ListeningUnitDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [lessonForm, setLessonForm] = useState(EMPTY_LESSON_FORM);
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);

  const [unitForm, setUnitForm] = useState(EMPTY_UNIT_FORM);
  const [editingUnitId, setEditingUnitId] = useState<number | null>(null);
  const [showUnitForm, setShowUnitForm] = useState(false);

  const loadLessons = useCallback(async () => {
    try {
      const res = await api.get<ListeningLessonsResponse>("/listening/lessons");
      setLessons(res.data.body);
    } catch {
      setLessons([]);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadLessons(); }, [loadLessons]);

  const selectedLesson = lessons.find((l) => l.id === selectedLessonId) ?? null;

  const loadUnits = useCallback(async (lessonKey: string) => {
    try {
      const res = await api.get<ListeningUnitsResponse>(`/listening/lessons/${lessonKey}/units`);
      setUnits(res.data.body);
    } catch {
      setUnits([]);
    }
  }, []);

  useEffect(() => {
    if (selectedLesson) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadUnits(selectedLesson.key);
    } else {
      setUnits([]);
    }
    setSelectedUnitId(null);
    setUnitDetail(null);
  }, [selectedLesson, loadUnits]);

  const selectedUnit = units.find((u) => u.id === selectedUnitId) ?? null;

  useEffect(() => {
    if (!selectedUnit) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnitDetail(null);
      return;
    }
    api.get<ListeningUnitDetailResponse>(`/listening/units/${selectedUnit.key}`)
      .then((res) => setUnitDetail(res.data.body))
      .catch(() => setUnitDetail(null));
  }, [selectedUnit]);

  const resetLessonForm = () => { setEditingLessonId(null); setLessonForm(EMPTY_LESSON_FORM); };

  const handleLessonSubmit = async () => {
    setError(null);
    try {
      if (editingLessonId) {
        await api.put(`/listening/lessons/${editingLessonId}`, {
          title: lessonForm.title,
          emoji: lessonForm.emoji || undefined,
          displayOrder: lessonForm.displayOrder === "" ? undefined : Number(lessonForm.displayOrder),
        });
      } else {
        await api.post("/listening/lessons", {
          key: lessonForm.key,
          title: lessonForm.title,
          emoji: lessonForm.emoji || undefined,
          displayOrder: lessonForm.displayOrder === "" ? undefined : Number(lessonForm.displayOrder),
        });
      }
      resetLessonForm();
      void loadLessons();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const handleLessonDelete = async (id: number) => {
    if (!confirm("ยืนยันลบบทเรียนนี้? Unit และบทสนทนาทั้งหมดในบทเรียนจะถูกลบไปด้วย")) return;
    try {
      await api.delete(`/listening/lessons/${id}`);
      if (selectedLessonId === id) setSelectedLessonId(null);
      void loadLessons();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const resetUnitForm = () => {
    setEditingUnitId(null);
    setUnitForm(EMPTY_UNIT_FORM);
    setShowUnitForm(false);
  };

  const startEditUnit = (u: ListeningUnitSummary, lines?: { speaker: string; textEn: string; textTh: string | null }[]) => {
    setEditingUnitId(u.id);
    setUnitForm({
      key: u.key,
      title: u.title,
      emoji: u.emoji ?? "",
      displayOrder: u.displayOrder,
      videoId: u.videoId,
      startSeconds: u.startSeconds,
      endSeconds: u.endSeconds,
      linesText: formatUnitLines(lines ?? []),
    });
    setShowUnitForm(true);
  };

  const handleUnitSubmit = async () => {
    if (!selectedLesson) return;
    setError(null);
    try {
      const lines = unitForm.linesText.trim() ? parseUnitLines(unitForm.linesText) : undefined;
      if (editingUnitId) {
        await api.put(`/listening/units/${editingUnitId}`, {
          title: unitForm.title,
          emoji: unitForm.emoji || undefined,
          displayOrder: unitForm.displayOrder === "" ? undefined : Number(unitForm.displayOrder),
          videoId: unitForm.videoId,
          startSeconds: unitForm.startSeconds === "" ? undefined : Number(unitForm.startSeconds),
          endSeconds: unitForm.endSeconds === "" ? undefined : Number(unitForm.endSeconds),
          lines,
        });
      } else {
        await api.post("/listening/units", {
          lessonId: selectedLesson.id,
          key: unitForm.key,
          title: unitForm.title,
          emoji: unitForm.emoji || undefined,
          displayOrder: unitForm.displayOrder === "" ? undefined : Number(unitForm.displayOrder),
          videoId: unitForm.videoId,
          startSeconds: Number(unitForm.startSeconds || 0),
          endSeconds: Number(unitForm.endSeconds || 0),
          lines,
        });
      }
      resetUnitForm();
      void loadUnits(selectedLesson.key);
      void loadLessons();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const handleUnitDelete = async (id: number) => {
    if (!confirm("ยืนยันลบ Unit นี้?")) return;
    try {
      await api.delete(`/listening/units/${id}`);
      if (selectedUnitId === id) setSelectedUnitId(null);
      if (selectedLesson) void loadUnits(selectedLesson.key);
      void loadLessons();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {error && <p style={{ color: "#f87171", fontSize: "0.85rem" }}>{error}</p>}

      <div style={cardStyle}>
        <h3 style={{ marginBottom: "0.75rem", fontWeight: 700 }}>{editingLessonId ? "แก้ไขบทเรียน" : "เพิ่มบทเรียน"}</h3>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {!editingLessonId && (
            <input placeholder="key (เช่น lesson-3)" value={lessonForm.key} onChange={(e) => setLessonForm({ ...lessonForm, key: e.target.value })} style={{ ...inputStyle, flex: "1 1 160px" }} />
          )}
          <input placeholder="ชื่อบทเรียน" value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} style={{ ...inputStyle, flex: "1 1 200px" }} />
          <input placeholder="emoji" value={lessonForm.emoji} onChange={(e) => setLessonForm({ ...lessonForm, emoji: e.target.value })} style={{ ...inputStyle, width: 80 }} />
          <input placeholder="ลำดับ" type="number" value={lessonForm.displayOrder} onChange={(e) => setLessonForm({ ...lessonForm, displayOrder: e.target.value === "" ? "" : Number(e.target.value) })} style={{ ...inputStyle, width: 90 }} />
          <button onClick={handleLessonSubmit} style={btnStyle("primary")}>{editingLessonId ? "บันทึก" : "เพิ่ม"}</button>
          {editingLessonId && <button onClick={resetLessonForm} style={btnStyle("ghost")}>ยกเลิก</button>}
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>บทเรียน</th>
              <th style={thStyle}>Key</th>
              <th style={thStyle}>Unit</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((l) => (
              <tr key={l.id} style={{ background: selectedLessonId === l.id ? "rgba(99,102,241,0.08)" : undefined }}>
                <td style={{ ...tdStyle, fontWeight: 700, color: "#e2e8f0", cursor: "pointer" }} onClick={() => setSelectedLessonId(l.id)}>
                  {l.emoji ?? "🎬"} {l.title}
                </td>
                <td style={tdStyle}>{l.key}</td>
                <td style={tdStyle}>{l.totalUnits}</td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button onClick={() => setSelectedLessonId(l.id)} style={btnStyle("ghost")}>จัดการ Unit</button>
                    <button
                      onClick={() => { setEditingLessonId(l.id); setLessonForm({ key: l.key, title: l.title, emoji: l.emoji ?? "", displayOrder: l.displayOrder }); }}
                      style={btnStyle("ghost")}
                    >
                      แก้ไข
                    </button>
                    <button onClick={() => handleLessonDelete(l.id)} style={btnStyle("danger")}>ลบ</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedLesson && (
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h3 style={{ fontWeight: 700 }}>Unit ในบทเรียน: {selectedLesson.emoji ?? "🎬"} {selectedLesson.title}</h3>
            {!showUnitForm && (
              <button onClick={() => { resetUnitForm(); setShowUnitForm(true); }} style={btnStyle("primary")}>+ เพิ่ม Unit</button>
            )}
          </div>

          {showUnitForm && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1rem", padding: "0.9rem", border: "1px solid var(--card-border)", borderRadius: 8 }}>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                {!editingUnitId && (
                  <input placeholder="key (เช่น lst3-unit1)" value={unitForm.key} onChange={(e) => setUnitForm({ ...unitForm, key: e.target.value })} style={{ ...inputStyle, flex: "1 1 160px" }} />
                )}
                <input placeholder="ชื่อ Unit" value={unitForm.title} onChange={(e) => setUnitForm({ ...unitForm, title: e.target.value })} style={{ ...inputStyle, flex: "1 1 160px" }} />
                <input placeholder="emoji" value={unitForm.emoji} onChange={(e) => setUnitForm({ ...unitForm, emoji: e.target.value })} style={{ ...inputStyle, width: 80 }} />
                <input placeholder="ลำดับ" type="number" value={unitForm.displayOrder} onChange={(e) => setUnitForm({ ...unitForm, displayOrder: e.target.value === "" ? "" : Number(e.target.value) })} style={{ ...inputStyle, width: 90 }} />
              </div>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                <input placeholder="YouTube videoId" value={unitForm.videoId} onChange={(e) => setUnitForm({ ...unitForm, videoId: e.target.value })} style={{ ...inputStyle, flex: "1 1 160px" }} />
                <input placeholder="startSeconds" type="number" value={unitForm.startSeconds} onChange={(e) => setUnitForm({ ...unitForm, startSeconds: e.target.value === "" ? "" : Number(e.target.value) })} style={{ ...inputStyle, width: 130 }} />
                <input placeholder="endSeconds" type="number" value={unitForm.endSeconds} onChange={(e) => setUnitForm({ ...unitForm, endSeconds: e.target.value === "" ? "" : Number(e.target.value) })} style={{ ...inputStyle, width: 130 }} />
              </div>
              <textarea
                placeholder={"บทพูด บรรทัดละ 1 บท รูปแบบ: Speaker | ข้อความอังกฤษ | คำแปลไทย (เว้นว่าง = ไม่แก้บทพูด)"}
                value={unitForm.linesText}
                onChange={(e) => setUnitForm({ ...unitForm, linesText: e.target.value })}
                rows={8}
                style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }}
              />
              <p style={{ color: "#64748b", fontSize: "0.78rem" }}>
                หมายเหตุ: ถ้าใส่บทพูดในช่องนี้ จะแทนที่บทพูดเดิมทั้งหมดของ Unit นี้
              </p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={handleUnitSubmit} style={btnStyle("primary")}>{editingUnitId ? "บันทึก" : "เพิ่ม Unit"}</button>
                <button onClick={resetUnitForm} style={btnStyle("ghost")}>ยกเลิก</button>
              </div>
            </div>
          )}

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Unit</th>
                  <th style={thStyle}>Key</th>
                  <th style={thStyle}>วินาที</th>
                  <th style={thStyle}>บรรทัด</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {units.map((u) => (
                  <tr key={u.id}>
                    <td style={{ ...tdStyle, fontWeight: 700, color: "#e2e8f0" }}>{u.emoji ?? "🎧"} {u.title}</td>
                    <td style={tdStyle}>{u.key}</td>
                    <td style={tdStyle}>{u.startSeconds}–{u.endSeconds}s</td>
                    <td style={tdStyle}>{u.totalLines}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <button
                          onClick={async () => {
                            setSelectedUnitId(u.id);
                            try {
                              const res = await api.get<ListeningUnitDetailResponse>(`/listening/units/${u.key}`);
                              startEditUnit(u, res.data.body.lines);
                            } catch {
                              startEditUnit(u);
                            }
                          }}
                          style={btnStyle("ghost")}
                        >
                          แก้ไข
                        </button>
                        <button onClick={() => handleUnitDelete(u.id)} style={btnStyle("danger")}>ลบ</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {unitDetail && !showUnitForm && (
            <p style={{ color: "#64748b", fontSize: "0.78rem", marginTop: "0.5rem" }}>
              เลือก Unit &ldquo;{unitDetail.title}&rdquo; แล้ว — กด &ldquo;แก้ไข&rdquo; เพื่อดู/แก้บทพูดทั้งหมด
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Scripts tab ─────────────────────────────────────────────────────────────

function ScriptsTab() {
  const [running, setRunning] = useState<RunnableScript | null>(null);
  const [category, setCategory] = useState("");
  const [count, setCount] = useState("");
  const [result, setResult] = useState<RunScriptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async (script: RunnableScript) => {
    setRunning(script);
    setError(null);
    setResult(null);
    try {
      const res = await api.post<ApiResponse<RunScriptResult>>(
        "/scripts/run",
        { script, category: category || undefined, count: count ? Number(count) : undefined },
        { timeout: 5 * 60 * 1000 },
      );
      setResult(res.data.body);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setRunning(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={cardStyle}>
        <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
          พารามิเตอร์เสริม (ใช้กับบาง script เท่านั้น เช่น vocab:generate)
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <input placeholder="category (ถ้ามี)" value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, flex: "1 1 200px" }} />
          <input placeholder="count (ถ้ามี)" value={count} onChange={(e) => setCount(e.target.value)} style={{ ...inputStyle, flex: "1 1 120px" }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.75rem" }}>
        {RUNNABLE_SCRIPTS.map((s) => (
          <div key={s} style={cardStyle}>
            <p style={{ fontWeight: 700, marginBottom: "0.75rem", fontFamily: "monospace", fontSize: "0.85rem" }}>{s}</p>
            <button
              onClick={() => handleRun(s)}
              disabled={running !== null}
              style={{ ...btnStyle("primary"), width: "100%", opacity: running !== null ? 0.6 : 1 }}
            >
              {running === s ? "กำลังรัน..." : "Run"}
            </button>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ ...cardStyle, borderColor: "#f87171", color: "#f87171" }}>{error}</div>
      )}

      {result && (
        <div style={cardStyle}>
          <p style={{ fontWeight: 700, marginBottom: "0.5rem" }}>
            ผลลัพธ์: {result.script} (exit code {result.exitCode})
          </p>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.8rem", color: "#94a3b8", maxHeight: 300, overflowY: "auto" }}>
            {result.stdout}
            {result.stderr}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Users tab ───────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

function daysFromNowIso(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: LIMIT };
      if (search) params.search = search;
      const res = await api.get<AdminUserListResponse>("/admin/users", { params });
      setUsers(res.data.body);
      setTotal(res.data.total ?? 0);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const grantDays = async (id: string, days: number) => {
    setError(null);
    try {
      const until = daysFromNowIso(days);
      await api.put(`/admin/users/${id}/access`, { freeAccessUntil: until });
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const revoke = async (id: string) => {
    if (!confirm("ยกเลิกสิทธิ์ใช้งานของ user นี้?")) return;
    setError(null);
    try {
      await api.put(`/admin/users/${id}/access`, { freeAccessUntil: null });
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <input
        placeholder="ค้นหา uid หรือชื่อ..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        style={{ ...inputStyle, maxWidth: 300 }}
      />

      {error && <div style={{ ...cardStyle, borderColor: "#f87171", color: "#f87171" }}>{error}</div>}

      <div style={{ ...cardStyle, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>UID</th>
              <th style={thStyle}>ชื่อ</th>
              <th style={thStyle}>คำที่เพิ่ม</th>
              <th style={thStyle}>Streak reward</th>
              <th style={thStyle}>หมดสิทธิ์วันที่</th>
              <th style={thStyle}>Admin</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td style={tdStyle} colSpan={7}>กำลังโหลด...</td></tr>
            ) : users.length === 0 ? (
              <tr><td style={tdStyle} colSpan={7}>ไม่พบผู้ใช้งาน</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "0.75rem" }}>{u.uid.slice(0, 10)}...</td>
                  <td style={tdStyle}>{u.displayName ?? "-"}</td>
                  <td style={tdStyle}>{u.contributedWordsCount}/10</td>
                  <td style={tdStyle}>{u.rewardedGoalStreak}</td>
                  <td style={tdStyle}>{formatDate(u.freeAccessUntil)}</td>
                  <td style={tdStyle}>{u.isAdmin ? "⭐" : "-"}</td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      <button onClick={() => grantDays(u.id, 7)} style={btnStyle("ghost")}>+7 วัน</button>
                      <button onClick={() => grantDays(u.id, 30)} style={btnStyle("ghost")}>+30 วัน</button>
                      <button onClick={() => revoke(u.id)} style={btnStyle("danger")}>ยกเลิกสิทธิ์</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", alignItems: "center" }}>
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} style={btnStyle("ghost")}>← ก่อนหน้า</button>
          <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={btnStyle("ghost")}>ถัดไป →</button>
        </div>
      )}
    </div>
  );
}
