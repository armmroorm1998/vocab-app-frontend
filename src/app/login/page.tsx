"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function setAuthCookies(uid: string, recoverKey: string) {
  const secureAttr = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  const commonAttrs = `; path=/; max-age=${AUTH_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secureAttr}`;
  document.cookie = `uid=${encodeURIComponent(uid)}${commonAttrs}`;
  document.cookie = `recoverKey=${encodeURIComponent(recoverKey)}${commonAttrs}`;
}

export default function LoginPage() {
  const [mode, setMode] = useState<'register' | 'recover'>('register');
  const [username, setUsername] = useState("");
  const [painttext, setPainttext] = useState(""); // สำหรับ register
  const [recoverKey, setRecoverKey] = useState(""); // สำหรับ recover
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  // No input for recoverKey, but frontend will generate if not provided
  const router = useRouter();

  useEffect(() => {
    const storedUid = localStorage.getItem("uid");
    const storedPainttext = localStorage.getItem("recoverKey");
    if (storedUid && storedPainttext) {
      setAuthCookies(storedUid, storedPainttext);
      router.replace("/");
    }
    // Do not call setError here to avoid setState in effect
    // Prevent access to login page if already logged in
    if (typeof window !== "undefined" && window.location.pathname === "/login" && storedUid && storedPainttext) {
      setAuthCookies(storedUid, storedPainttext);
      router.replace("/");
    }
  }, [router]);

  function generateRandomKey(length = 16) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setCopied(false);
    try {
      // username ไม่บังคับ
      const recoverKey = generateRandomKey();
      const payload = { uid: username || undefined, recoverKey };
      const res = await api.post("/user/register", payload);
      const data = res.data;
      // New backend response: { user: {...}, recovery_key: "..." }
      if (data && data.user && data.recovery_key) {
        setPainttext(data.recovery_key);
        localStorage.setItem("uid", data.user.uid);
        localStorage.setItem("recoverKey", data.recovery_key);
        setAuthCookies(data.user.uid, data.recovery_key);
        // รอให้ user copy painttext แล้วค่อย redirect
      } else {
        setError("ไม่สามารถสร้างบัญชีได้");
      }
    } catch {
      setError("เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  const [recoverSuccess, setRecoverSuccess] = useState(false);
  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setCopied(false);
    setRecoverSuccess(false);
    try {
      if (!recoverKey) return;
      const res = await api.post("/user/recover", { recoveryKey: recoverKey });
      const data = res.data;
      console.log("Recover response:", data);
      if (data && data.success && data.user.uid) {
        localStorage.setItem("uid", data.user.uid);
        localStorage.setItem("recoverKey", recoverKey);
        setAuthCookies(data.user.uid, recoverKey);
        setRecoverSuccess(true);
        window.location.href = "/";
        setTimeout(() => window.location.reload(), 100);
      } else {
        setError(data?.message || "ไม่สามารถกู้บัญชีได้");
      }
    } catch {
      setError("เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (painttext) {
      await navigator.clipboard.writeText(painttext);
      setCopied(true);
      // Redirect and force reload to ensure menu state is updated
      window.location.href = "/";
      setTimeout(() => window.location.reload(), 100);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
      <div
        style={{
          maxWidth: 400,
          width: "100%",
          padding: 32,
          background: "var(--card)",
          borderRadius: 16,
          boxShadow: "0 2px 12px #0002",
          border: "1px solid var(--card-border)",
        }}
      >
        {painttext ? (
          <>
            <div style={{ textAlign: "center", marginBottom: 10 }}>
              <span style={{ color: '#64748b', fontSize: 15, fontWeight: 500 }}>Painttext ของคุณ</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <input
                type="text"
                value={painttext}
                readOnly
                style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #232336", fontSize: 16, background: "#181825", color: "#fff" }}
              />
              <button onClick={handleCopy} type="button" style={{ padding: "8px 18px", borderRadius: 8, background: copied ? "#10b981" : "var(--accent)", color: "#fff", border: 0, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>{copied ? "คัดลอกแล้ว กำลังเข้าสู่ระบบ..." : "คัดลอก"}</button>
            </div>
            <div style={{ color: '#64748b', fontSize: 14, textAlign: 'center', marginBottom: 8 }}>คัดลอก Painttext แล้วจะเข้าสู่ระบบอัตโนมัติ</div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", gap: 0, marginBottom: 28, borderRadius: 12, overflow: "hidden", border: "1px solid var(--card-border)", background: "#181825" }}>
              <button
                onClick={() => {
                  setMode('register');
                  setPainttext("");
                  setError("");
                }}
                style={{
                  flex: 1,
                  padding: "1.1rem 0",
                  fontWeight: 700,
                  fontSize: 18,
                  background: mode === 'register' ? "var(--accent)" : "transparent",
                  color: mode === 'register' ? "#fff" : "#cbd5e1",
                  border: 0,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                เริ่มใช้งานใหม่
              </button>
              <button
                onClick={() => {
                  setMode('recover');
                  setPainttext("");
                  setError("");
                }}
                style={{
                  flex: 1,
                  padding: "1.1rem 0",
                  fontWeight: 700,
                  fontSize: 18,
                  background: mode === 'recover' ? "var(--accent)" : "transparent",
                  color: mode === 'recover' ? "#fff" : "#cbd5e1",
                  border: 0,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                กู้คืนบัญชี
              </button>
            </div>
            {mode === 'register' && (
              <form onSubmit={handleRegister}>
                <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 18 }}>เริ่มใช้งาน</div>
                <div style={{ fontSize: 15, marginBottom: 8, color: '#cbd5e1' }}>ชื่อของคุณ (ไม่บังคับ)</div>
                <input
                  type="text"
                  placeholder="เช่น Mr.Joe"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #232336", marginBottom: 12, background: "#181825", color: "#fff", fontSize: 16 }}
                />
                {/* Recovery Key input removed as per requirements */}
                <button
                  type="submit"
                  disabled={loading || !!painttext}
                  style={{
                    width: "100%",
                    padding: 14,
                    borderRadius: 12,
                    background: loading || !!painttext ? "#64748b" : "#22c55e",
                    color: loading || !!painttext ? "#cbd5e1" : "#fff",
                    fontWeight: 700,
                    fontSize: 18,
                    border: 0,
                    cursor: loading || !!painttext ? "not-allowed" : "pointer",
                    marginBottom: 18,
                    opacity: loading || !!painttext ? 0.6 : 1,
                    filter: loading || !!painttext ? "grayscale(0.5)" : "none"
                  }}
                >
                  {loading ? "กำลังสร้างบัญชี..." : "สร้างบัญชี"}
                </button>
                {error && <div style={{ color: "#e11d48", marginTop: 10, textAlign: 'center' }}>{error}</div>}
              </form>
            )}
            {mode === 'recover' && (
              <form onSubmit={handleRecover}>
                <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 18 }}>กู้คืนด้วย Recovery Key</div>
                <input
                  type="text"
                  placeholder="กรอก Recovery Key ที่เคยได้รับ"
                  value={recoverKey}
                  onChange={e => setRecoverKey(e.target.value)}
                  style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #232336", marginBottom: 18, background: "#181825", color: "#fff", fontSize: 16 }}
                  required
                  minLength={6}
                />
                <button
                  type="submit"
                  disabled={loading || !recoverKey}
                  style={{
                    width: "100%",
                    padding: 14,
                    borderRadius: 12,
                    background: loading || !recoverKey ? "#64748b" : "#86efac",
                    color: loading || !recoverKey ? "#cbd5e1" : "#222",
                    fontWeight: 700,
                    fontSize: 18,
                    border: 0,
                    cursor: loading || !recoverKey ? "not-allowed" : "pointer",
                    marginBottom: 18,
                    opacity: loading || !recoverKey ? 0.6 : 1,
                    filter: loading || !recoverKey ? "grayscale(0.5)" : "none"
                  }}
                >
                  {loading ? "กำลังกู้บัญชี..." : recoverSuccess ? "กู้สำเร็จ! กำลังเข้าสู่ระบบ..." : "กู้คืน"}
                </button>
                {recoverSuccess && <div style={{ color: '#22c55e', textAlign: 'center', marginBottom: 8 }}>กู้บัญชีสำเร็จ กำลังเข้าสู่ระบบ...</div>}
                <div style={{ textAlign: "center" }}>
                  <button type="button" onClick={() => {
                    setMode('register');
                    setRecoverKey("");
                    setError("");
                  }} style={{ background: 'none', border: 0, color: '#64748b', fontSize: 15, textDecoration: 'underline', cursor: 'pointer' }}>ย้อนกลับ</button>
                </div>
                {error && <div style={{ color: "#e11d48", marginTop: 10, textAlign: 'center' }}>{error}</div>}
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
