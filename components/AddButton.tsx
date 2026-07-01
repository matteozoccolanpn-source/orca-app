"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import CaptureSheet from "@/components/CaptureSheet";

/* Bottone ＋ galleggiante, globale, sopra ogni schermata. Apre la CaptureSheet
 * (come faceva il ＋ centrale della vecchia bottom nav). Non è una schermata:
 * non fa parte dello swipe. */
export default function AddButton() {
  const [capture, setCapture] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setCapture(true)}
        aria-label="Aggiungi"
        className="fixed z-50 flex items-center justify-center rounded-full text-white transition-transform duration-200 active:scale-95"
        style={{
          right: "var(--gutter)",
          bottom: "calc(env(safe-area-inset-bottom) + 8px)",
          width: 54,
          height: 54,
          background: "var(--keiko-grad)",
          boxShadow: "0 13px 26px -8px rgba(95, 71, 214, .55)",
        }}
      >
        <Plus className="size-6" />
      </button>
      <CaptureSheet open={capture} onClose={() => setCapture(false)} />
    </>
  );
}
