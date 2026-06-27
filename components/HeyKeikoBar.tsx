"use client";

import { ArrowUp } from "lucide-react";

function MiniOrca({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="23" fill="#0d1922" />
      <ellipse cx="23" cy="21" rx="21" ry="20" fill="#243440" />
      <path d="M32 6 C34 1 38 0 40 4 C42 8 37 13 32 14 Z" fill="#243440" />
      <ellipse cx="20" cy="36" rx="18" ry="13" fill="#f1f6f6" />
      <path d="M7 36 C10 46 34 47 40 36 C36 46 16 48 9 42 C7 40 7 38 7 36 Z" fill="#101a20" />
      <path d="M11 37 L19 34 L15 43 Z" fill="#ffffff" />
      <path d="M23 34 L31 36 L26 43 Z" fill="#ffffff" />
      <ellipse cx="23" cy="43" rx="5" ry="2.5" fill="#f79e78" />
      <ellipse cx="31" cy="17" rx="9" ry="5" fill="#f1f6f6" transform="rotate(-12 31 17)" />
      <circle cx="27" cy="19" r="5.5" fill="#ffffff" />
      <circle cx="26" cy="20" r="3" fill="#101a20" />
      <circle cx="25" cy="19" r="1.2" fill="#ffffff" />
    </svg>
  );
}

export default function HeyKeikoBar() {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 66px)" }}
    >
      <div
        className="pointer-events-auto flex w-full max-w-lg items-center gap-3 px-3 py-2 backdrop-blur-xl"
        style={{
          background: "var(--bar)",
          border: "1px solid var(--bar-line)",
          borderRadius: "var(--r-lg)",
        }}
      >
        <span
          className="flex shrink-0 items-center justify-center rounded-full"
          style={{ width: 34, height: 34, background: "color-mix(in srgb, var(--primary) 16%, transparent)" }}
          aria-hidden
        >
          <MiniOrca size={27} />
        </span>
        {/* TODO: backend — assistente non ancora collegato */}
        <input
          type="text"
          readOnly
          placeholder="Chiedi a Keiko…"
          className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:[color:var(--app-faint)]"
          style={{ color: "var(--app-text)" }}
        />
        <button
          type="button"
          aria-label="Invia"
          className="flex shrink-0 items-center justify-center text-white transition-all duration-200 ease-out active:scale-95"
          style={{ width: "var(--tap)", height: "var(--tap)", borderRadius: "var(--r-sm)", background: "var(--keiko-grad)" }}
        >
          <ArrowUp size={17} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
