import Link from "next/link";

const features = [
  {
    href: "/vocabulary",
    icon: "📖",
    title: "คำศัพท์",
    desc: "ค้นหาและดูคำศัพท์ทั้งหมด พร้อมคำอ่านภาษาไทย IPA และตัวอย่างประโยค",
    color: "#6366f1",
  },
  {
    href: "/flashcard",
    icon: "🃏",
    title: "Flashcard",
    desc: "ฝึกจำคำศัพท์ด้วยการ์ดพลิก เห็นคำ → เดาความหมาย → พลิกเพื่อตรวจสอบ",
    color: "#22d3ee",
  },
  {
    href: "/quiz",
    icon: "🎯",
    title: "Quiz",
    desc: "ทดสอบความรู้ด้วยข้อสอบ Multiple Choice ดูสกอร์และสรุปผลทันที",
    color: "#a78bfa",
  },
];

export default function HomePage() {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "4rem 1.5rem" }}>
      <div style={{ textAlign: "center", marginBottom: "4rem" }}>
        <h1
          style={{
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            fontWeight: 800,
            marginBottom: "1rem",
            lineHeight: 1.2,
          }}
        >
          เรียนภาษาอังกฤษ{" "}
          <span
            style={{
              background: "linear-gradient(135deg,#6366f1,#a78bfa,#22d3ee)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ได้ทุกที่
          </span>
        </h1>
        <p
          style={{
            fontSize: "1.15rem",
            color: "#94a3b8",
            maxWidth: 480,
            margin: "0 auto 2rem",
            lineHeight: 1.7,
          }}
        >
          คลังคำศัพท์ภาษาอังกฤษพร้อมคำอ่านไทย ฝึกด้วย Flashcard และทดสอบด้วย Quiz
        </p>
        <Link
          href="/vocabulary"
          style={{
            display: "inline-block",
            background: "var(--accent)",
            color: "#fff",
            padding: "0.75rem 2rem",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: "1rem",
            textDecoration: "none",
          }}
        >
          เริ่มเรียนเลย →
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {features.map((f) => (
          <Link key={f.href} href={f.href} style={{ textDecoration: "none" }}>
            <div
              style={{
                background: "var(--card)",
                border: "1px solid var(--card-border)",
                borderRadius: 16,
                padding: "2rem",
                cursor: "pointer",
                height: "100%",
              }}
            >
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>{f.icon}</div>
              <h2
                style={{
                  fontSize: "1.3rem",
                  fontWeight: 700,
                  color: f.color,
                  marginBottom: "0.5rem",
                }}
              >
                {f.title}
              </h2>
              <p style={{ color: "#94a3b8", lineHeight: 1.6, fontSize: "0.95rem" }}>
                {f.desc}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
