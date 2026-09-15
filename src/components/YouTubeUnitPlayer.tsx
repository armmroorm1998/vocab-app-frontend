"use client";

import { useEffect, useRef, useState } from "react";

interface YouTubeUnitPlayerProps {
  videoId: string;
  startSeconds: number;
  endSeconds: number;
}

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  destroy(): void;
}

interface YTPlayerEvent {
  target: YTPlayer;
  data: number;
}

interface YTNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: (e: YTPlayerEvent) => void;
        onStateChange?: (e: YTPlayerEvent) => void;
      };
    },
  ) => YTPlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiLoadPromise: Promise<YTNamespace> | null = null;

function loadYouTubeIframeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT as YTNamespace);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiLoadPromise;
}

function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/** Collapsible YouTube embed scoped to a single Unit's start/end seconds, with play/pause + seek controls, for listening/shadowing practice. */
export default function YouTubeUnitPlayer({
  videoId,
  startSeconds,
  endSeconds,
}: YouTubeUnitPlayerProps) {
  const [open, setOpen] = useState(false);
  const [audioOnly, setAudioOnly] = useState(true);
  const [ready, setReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(startSeconds);

  // wrapperRef is React-owned and only ever has its size toggled (audioOnly).
  // hostRef is handed to YT.Player, which destructively replaces it with its
  // own <iframe> — so it must never be re-styled by React after mount, or the
  // real iframe silently stops matching what's on screen (shows up black).
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fillIframe = () => {
    const iframe = wrapperRef.current?.querySelector("iframe");
    if (!iframe) return;
    iframe.style.position = "absolute";
    iframe.style.inset = "0";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    setReady(false);
    setIsPlaying(false);
    setCurrentTime(startSeconds);

    loadYouTubeIframeApi().then((YT) => {
      if (cancelled || !hostRef.current) return;
      playerRef.current = new YT.Player(hostRef.current, {
        videoId,
        playerVars: {
          start: startSeconds,
          end: endSeconds,
          autoplay: 1,
          rel: 0,
        },
        events: {
          onReady: () => {
            fillIframe();
            setReady(true);
          },
          onStateChange: (e) => {
            setIsPlaying(e.data === YT.PlayerState.PLAYING);
          },
        },
      });
      // The iframe is inserted synchronously; fix its size immediately too,
      // instead of waiting for onReady (which fires once the video buffers).
      fillIframe();
    });

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, videoId, startSeconds, endSeconds]);

  useEffect(() => {
    if (!ready) return;
    pollRef.current = setInterval(() => {
      const t = playerRef.current?.getCurrentTime();
      if (typeof t === "number") setCurrentTime(t);
    }, 400);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [ready]);

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
  };

  const restart = () => {
    playerRef.current?.seekTo(startSeconds, true);
    playerRef.current?.playVideo();
  };

  const seekTo = (seconds: number) => {
    setCurrentTime(seconds);
    playerRef.current?.seekTo(seconds, true);
  };

  return (
    <div style={{ marginTop: "0.7rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <button
          onClick={() => setOpen((prev) => !prev)}
          style={{
            border: "1px solid var(--card-border)",
            borderRadius: 10,
            padding: "0.55rem 0.9rem",
            fontSize: "0.85rem",
            fontWeight: 700,
            cursor: "pointer",
            background: open ? "rgba(99,102,241,0.12)" : "transparent",
            color: "#cbd5e1",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          {audioOnly ? "🔊" : "🎧"} {open ? "ปิดเสียง/วิดีโอ" : "ฟังบทสนทนานี้จากวิดีโอต้นฉบับ"}
        </button>

        {open && (
          <button
            onClick={() => setAudioOnly((prev) => !prev)}
            style={{
              border: "1px solid var(--card-border)",
              borderRadius: 10,
              padding: "0.55rem 0.9rem",
              fontSize: "0.82rem",
              cursor: "pointer",
              background: audioOnly ? "rgba(99,102,241,0.12)" : "transparent",
              color: "#94a3b8",
            }}
          >
            {audioOnly ? "📺 แสดงวิดีโอ" : "🔇 ซ่อนวิดีโอ (ฟังเสียงอย่างเดียว)"}
          </button>
        )}
      </div>

      {open && (
        <div style={{ marginTop: "0.65rem" }}>
          <div
            ref={wrapperRef}
            style={
              audioOnly
                ? {
                    width: 1,
                    height: 1,
                    overflow: "hidden",
                    position: "absolute",
                    opacity: 0,
                    pointerEvents: "none",
                  }
                : {
                    position: "relative",
                    width: "100%",
                    paddingBottom: "56.25%",
                    borderRadius: 12,
                    overflow: "hidden",
                    border: "1px solid var(--card-border)",
                  }
            }
          >
            <div ref={hostRef} />
          </div>

          {/* Custom controls — needed because the video is visually hidden in audio-only mode */}
          <div
            style={{
              marginTop: "0.6rem",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              background: "var(--card)",
              border: "1px solid var(--card-border)",
              borderRadius: 10,
              padding: "0.55rem 0.75rem",
            }}
          >
            <button
              onClick={togglePlay}
              disabled={!ready}
              style={{
                border: "none",
                borderRadius: 8,
                width: 34,
                height: 34,
                flexShrink: 0,
                fontSize: "1rem",
                cursor: ready ? "pointer" : "default",
                background: "var(--accent)",
                color: "#fff",
                opacity: ready ? 1 : 0.5,
              }}
            >
              {isPlaying ? "⏸" : "▶️"}
            </button>
            <button
              onClick={restart}
              disabled={!ready}
              title="เริ่ม Unit นี้ใหม่"
              style={{
                border: "1px solid var(--card-border)",
                borderRadius: 8,
                width: 34,
                height: 34,
                flexShrink: 0,
                fontSize: "0.9rem",
                cursor: ready ? "pointer" : "default",
                background: "transparent",
                color: "#cbd5e1",
                opacity: ready ? 1 : 0.5,
              }}
            >
              ⏮
            </button>
            <span style={{ color: "#64748b", fontSize: "0.75rem", flexShrink: 0, minWidth: 34 }}>
              {formatTime(currentTime - startSeconds)}
            </span>
            <input
              type="range"
              min={startSeconds}
              max={endSeconds}
              step={1}
              value={Math.min(Math.max(currentTime, startSeconds), endSeconds)}
              disabled={!ready}
              onChange={(e) => seekTo(Number(e.target.value))}
              style={{ flex: 1, accentColor: "var(--accent)" }}
            />
            <span style={{ color: "#64748b", fontSize: "0.75rem", flexShrink: 0, minWidth: 34 }}>
              {formatTime(endSeconds - startSeconds)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
