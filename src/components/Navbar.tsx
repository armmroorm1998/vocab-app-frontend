"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "หน้าแรก" },
  { href: "/vocabulary", label: "คำศัพท์" },
  { href: "/flashcard", label: "Flashcard" },
  { href: "/quiz", label: "Quiz" },
  { href: "/fill-blank", label: "เติมคำ" },
  { href: "/verb-forms", label: "กริยา 3 ช่อง" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      className="sticky top-0 z-50 backdrop-blur-md border-b"
      style={{
        background: "rgba(26,26,36,0.95)",
        borderColor: "var(--card-border)",
      }}
    >
      <div className="max-w-[1100px] mx-auto px-3 sm:px-6 flex items-center h-[60px]">
        {/* Logo */}
        <Link
          href="/"
          className="shrink-0 font-bold text-base sm:text-[1.2rem] tracking-tight no-underline"
          style={{ color: "var(--accent-hover)", letterSpacing: "-0.5px" }}
        >
          Vocab<span style={{ color: "#e2e8f0" }}>App</span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden sm:flex gap-1 ml-auto">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg no-underline transition-all duration-150 whitespace-nowrap px-[0.9rem] py-[0.4rem] text-[0.9rem]"
                style={{
                  fontWeight: active ? 600 : 400,
                  color: active ? "#fff" : "#94a3b8",
                  background: active ? "var(--accent)" : "transparent",
                }}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        {/* Hamburger Button (mobile only) */}
        <button
          className="sm:hidden ml-auto flex flex-col justify-center items-center w-9 h-9 gap-[5px]"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span
            className="block w-5 h-[2px] rounded transition-all duration-200"
            style={{
              background: "#e2e8f0",
              transform: menuOpen ? "translateY(7px) rotate(45deg)" : "none",
            }}
          />
          <span
            className="block w-5 h-[2px] rounded transition-all duration-200"
            style={{
              background: "#e2e8f0",
              opacity: menuOpen ? 0 : 1,
            }}
          />
          <span
            className="block w-5 h-[2px] rounded transition-all duration-200"
            style={{
              background: "#e2e8f0",
              transform: menuOpen ? "translateY(-7px) rotate(-45deg)" : "none",
            }}
          />
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <div
          className="sm:hidden flex flex-col border-t px-3 py-2"
          style={{
            background: "rgba(26,26,36,0.98)",
            borderColor: "var(--card-border)",
          }}
        >
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg no-underline transition-all duration-150 px-3 py-2.5 text-sm"
                style={{
                  fontWeight: active ? 600 : 400,
                  color: active ? "#fff" : "#94a3b8",
                  background: active ? "var(--accent)" : "transparent",
                }}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
