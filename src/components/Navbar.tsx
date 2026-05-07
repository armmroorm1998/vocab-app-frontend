"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "หน้าแรก" },
  { href: "/vocabulary", label: "คำศัพท์" },
  { href: "/flashcard", label: "Flashcard" },
  { href: "/quiz", label: "Quiz" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        background: "rgba(26,26,36,0.95)",
        borderBottom: "1px solid var(--card-border)",
        backdropFilter: "blur(10px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "0 1.5rem",
          display: "flex",
          alignItems: "center",
          height: 60,
          gap: "2rem",
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            fontWeight: 700,
            fontSize: "1.2rem",
            color: "var(--accent-hover)",
            textDecoration: "none",
            letterSpacing: "-0.5px",
          }}
        >
          Vocab<span style={{ color: "#e2e8f0" }}>App</span>
        </Link>

        {/* Links */}
        <div style={{ display: "flex", gap: "0.25rem", marginLeft: "auto" }}>
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                style={{
                  padding: "0.4rem 0.9rem",
                  borderRadius: 8,
                  fontSize: "0.9rem",
                  fontWeight: active ? 600 : 400,
                  color: active ? "#fff" : "#94a3b8",
                  background: active ? "var(--accent)" : "transparent",
                  textDecoration: "none",
                  transition: "all 0.15s",
                }}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
