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

        {/* Links */}
        <div className="flex gap-0.5 sm:gap-1 ml-auto">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg no-underline transition-all duration-150 whitespace-nowrap px-2 py-1.5 text-xs sm:px-[0.9rem] sm:py-[0.4rem] sm:text-[0.9rem]"
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
      </div>
    </nav>
  );
}
