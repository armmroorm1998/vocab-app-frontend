import fs from "fs";
import path from "path";

// Opt out of static rendering — the QR file can be added after build/dev
// startup, so this check must re-run on every request, not just once.
export const dynamic = "force-dynamic";

export default function DonatePage() {
  const qrExists = fs.existsSync(
    path.join(process.cwd(), "public", "donate-qr.png"),
  );

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: "2rem 1.5rem", textAlign: "center" }}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.5rem" }}>
        🙏 สนับสนุนผู้พัฒนา
      </h1>
      <p style={{ color: "#94a3b8", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
        ถ้าแอปนี้มีประโยชน์กับคุณ สามารถสนับสนุนผู้พัฒนาได้ผ่าน PromptPay ด้านล่าง
        <br />
        (ไม่บังคับ และไม่มีผลต่อการใช้งานแอปแต่อย่างใด)
      </p>

      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--card-border)",
          borderRadius: 14,
          padding: "1.5rem",
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        {qrExists ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/donate-qr.png"
            alt="PromptPay QR code สำหรับสนับสนุนผู้พัฒนา"
            style={{ width: 240, height: 240, background: "#fff", borderRadius: 8, padding: 8 }}
          />
        ) : (
          <div
            style={{
              width: 240,
              height: 240,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748b",
              fontSize: "0.85rem",
              padding: "1rem",
              border: "1px dashed var(--card-border)",
              borderRadius: 8,
            }}
          >
            ยังไม่ได้ตั้งค่า QR code — เพิ่มไฟล์รูป PromptPay QR ไว้ที่{" "}
            <code>public/donate-qr.png</code>
          </div>
        )}
        <p style={{ color: "#cbd5e1", fontSize: "0.9rem" }}>สแกนด้วยแอปธนาคารเพื่อสนับสนุน</p>
      </div>

      <p style={{ color: "#64748b", fontSize: "0.85rem", marginTop: "1.5rem" }}>
        ขอบคุณที่ใช้งาน MyVocab ❤️
      </p>
    </div>
  );
}
