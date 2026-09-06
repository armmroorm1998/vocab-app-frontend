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

const TABS = ["คำศัพท์", "หมวดหมู่", "Scripts", "ผู้ใช้งาน"] as const;
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
