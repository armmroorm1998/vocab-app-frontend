"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useSyncExternalStore } from "react";
import { FEATURE_FILL_BLANK_ENABLED } from "@/lib/features";
import api from "@/lib/api";
import { ApiResponse, StreakInfo } from "@/types";

const links = [
  { href: "/", label: "หน้าแรก" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/vocabulary", label: "คำศัพท์" },
  { href: "/flashcard", label: "Flashcard" },
  { href: "/quiz", label: "Quiz" },
  { href: "/conversation-quiz", label: "บทสนทนา" },
  { href: "/verb-forms", label: "กริยา 3 ช่อง" },
];

const navLinks = FEATURE_FILL_BLANK_ENABLED
  ? [...links.slice(0, 5), { href: "/fill-blank", label: "เติมคำ" }, ...links.slice(5)]
  : links;


export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [streak, setStreak] = useState<number>(0);
  const [goalMet, setGoalMet] = useState(false);

  const loggedIn = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {};
      window.addEventListener("storage", onStoreChange);
      return () => window.removeEventListener("storage", onStoreChange);
    },
    () => !!localStorage.getItem("uid"),
    () => false
  );

  useEffect(() => {
    if (!loggedIn) return;
    const fetchStreak = () => {
      api.get<ApiResponse<StreakInfo>>("/user/streak")
        .then((res) => {
          setStreak(res.data.body.currentStreak);
          setGoalMet(res.data.body.goalMet);
        })
        .catch(() => {});
    };
    fetchStreak();
    window.addEventListener("vocab:streak-refresh", fetchStreak);
    return () => window.removeEventListener("vocab:streak-refresh", fetchStreak);
  }, [loggedIn]);

  const handleLogout = () => {
    localStorage.removeItem("uid");
    localStorage.removeItem("recoverKey");
    document.cookie = "uid=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "recoverKey=; path=/; max-age=0; SameSite=Lax";
    setMenuOpen(false);
    router.replace("/login");
  };

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
          My<span style={{
              background: "linear-gradient(135deg,#6366f1,#a78bfa,#22d3ee)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>Vocab</span>
        </Link>

        {/* Desktop Links */}
        {loggedIn && (
          <div className="hidden sm:flex gap-1 ml-auto">
            {navLinks.map((l) => {
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
            <button
              onClick={handleLogout}
              className="rounded-lg transition-all duration-150 whitespace-nowrap px-[0.9rem] py-[0.4rem] text-[0.9rem] ml-2"
              style={{
                fontWeight: 600,
                color: "#fff",
                background: "#e11d48",
                border: 0,
                cursor: "pointer",
              }}
            >
              ออกจากระบบ
            </button>
            {streak > 0 && (
              <span
                title={`Streak ${streak} วัน${goalMet ? " (เป้าหมายวันนี้ครบแล้ว! 🎉)" : ""}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.2rem",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: goalMet ? "#facc15" : "#fb923c",
                  padding: "0.3rem 0.6rem",
                  borderRadius: 8,
                  background: goalMet ? "rgba(250,204,21,0.12)" : "rgba(251,146,60,0.12)",
                  border: `1px solid ${goalMet ? "rgba(250,204,21,0.3)" : "rgba(251,146,60,0.3)"}`,
                  cursor: "default",
                  whiteSpace: "nowrap",
                }}
              >
                🔥 {streak}
              </span>
            )}
          </div>
        )}

        {/* Hamburger Button (mobile only) */}
        {loggedIn && (
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
        )}
      </div>

      {/* Mobile Dropdown Menu */}
      {menuOpen && loggedIn && (
        <div
          className="sm:hidden flex flex-col border-t px-3 py-2"
          style={{
            background: "rgba(26,26,36,0.98)",
            borderColor: "var(--card-border)",
          }}
        >
          {navLinks.map((l) => {
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
          <button
            onClick={() => { setMenuOpen(false); handleLogout(); }}
            className="rounded-lg transition-all duration-150 px-3 py-2.5 text-sm mt-2"
            style={{
              fontWeight: 600,
              color: "#fff",
              background: "#e11d48",
              border: 0,
              cursor: "pointer",
            }}
          >
            ออกจากระบบ
          </button>
          {streak > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.5rem 0.75rem",
                fontSize: "0.85rem",
                fontWeight: 700,
                color: goalMet ? "#facc15" : "#fb923c",
                marginTop: "0.25rem",
              }}
            >
              🔥 Streak {streak} วัน{goalMet ? " · เป้าหมายวันนี้ครบ!" : ""}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
