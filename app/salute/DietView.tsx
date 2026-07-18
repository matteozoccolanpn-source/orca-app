"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Coffee,
  Apple,
  UtensilsCrossed,
  Cookie,
  Moon,
  Utensils,
  RefreshCw,
  Camera,
  FileText,
  ImagePlus,
  Loader2,
  Check,
  Trash2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DietWeek, DietMeal } from "@/lib/supabase";
import { DAY_ORDER, DAY_FULL, todayDietKey } from "@/app/components/DietMeal";
import KeikoShell, { useKeikoToast } from "@/app/components/keiko/KeikoShell";
import DietSwap from "./DietSwap";

/* Salva lo scambio di un'opzione nel piano (giorno → pasto → opzione).
   Riusa /api/diet/save, esattamente come prima. */
type CommitSwap = (day: string, mealIndex: number, optionIndex: number, newText: string) => Promise<void>;

/* Icona categoria coerente col nome del pasto (SVG, mai emoji). */
function iconForMeal(pasto: string): LucideIcon {
  const p = pasto.toLowerCase();
  if (p.includes("colazione")) return Coffee;
  if (p.includes("spuntino")) return Apple;
  if (p.includes("pranzo")) return UtensilsCrossed;
  if (p.includes("merenda")) return Cookie;
  if (p.includes("cena")) return Moon;
  return Utensils;
}

function formatUpdated(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" }).format(d);
}

export default function DietView({
  week,
  updatedAt,
}: {
  week: DietWeek | null;
  updatedAt: string | null;
}) {
  return (
    <KeikoShell title="Dieta" backHref="/" active="dieta">
      <DietBody week={week} updatedAt={updatedAt} />
    </KeikoShell>
  );
}

function DietBody({ week, updatedAt }: { week: DietWeek | null; updatedAt: string | null }) {
  const router = useRouter();
  const toast = useKeikoToast();

  const todayKey = todayDietKey();
  const daysWithMeals = week ? DAY_ORDER.filter((k) => (week[k]?.length ?? 0) > 0) : [];
  const hasDiet = daysWithMeals.length > 0;
  const todayMeals: DietMeal[] = week?.[todayKey] ?? [];
  const futureDays = daysWithMeals.filter((k) => k !== todayKey);

  const [uploadOpen, setUploadOpen] = useState(false);

  const commitSwap: CommitSwap = async (day, mealIndex, optionIndex, newText) => {
    if (!week) return;
    const newWeek: DietWeek = structuredClone(week);
    const meal = newWeek[day]?.[mealIndex];
    if (!meal || !Array.isArray(meal.opzioni) || optionIndex >= meal.opzioni.length) return;
    meal.opzioni[optionIndex] = newText;
    const res = await fetch("/api/diet/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ week: newWeek }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast(data.error || "Salvataggio non riuscito");
      throw new Error("save failed");
    }
    toast("Pasto aggiornato ✓");
    router.refresh();
  };

  // ---- hero: valori veri, quel che manca si compatta ----
  const heroVk = "La tua dieta";
  const heroTitle = hasDiet
    ? todayMeals.length > 0
      ? `Oggi · ${DAY_FULL[todayKey]}`
      : "Giornata libera 🌿"
    : "Ancora nessuna dieta";
  const heroSub = hasDiet
    ? [
        todayMeals.length > 0 ? `${todayMeals.length} ${todayMeals.length === 1 ? "pasto" : "pasti"} oggi` : "Nessun pasto per oggi",
        formatUpdated(updatedAt) && `aggiornata ${formatUpdated(updatedAt)}`,
      ]
        .filter(Boolean)
        .join(" · ")
    : "Carica il piano e te lo organizzo giorno per giorno";

  return (
    <>
      {/* spinner + reduced-motion (animazioni nuove) */}
      <style>{`
        @keyframes k_saluteSpin { to { transform: rotate(360deg); } }
        .k-spin { animation: k_saluteSpin .8s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .k-spin { animation: none; } }
      `}</style>

      {/* ---------- HERO ---------- */}
      <div className="vHero">
        <div
          className="art"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(110% 80% at 85% -6%,rgba(240,178,74,.42) 0%,transparent 55%),linear-gradient(168deg,#6E4A18 0%,#33210A 60%,#170F05 100%)",
          }}
        />
        <div className="shade" />
        <span className="vk">{heroVk}</span>
        <h4>{heroTitle}</h4>
        <div className="vs2">{heroSub}</div>
        <div className="vActs">
          <button type="button" className="chipA" onClick={() => setUploadOpen((o) => !o)}>
            <Camera style={{ width: 13, height: 13, verticalAlign: "-2px", marginRight: 4 }} />
            Carica settimana
          </button>
          {hasDiet && (
            <button type="button" className="chipA" onClick={() => toast("Quale pasto scambiamo? 🔁")}>
              <RefreshCw style={{ width: 13, height: 13, verticalAlign: "-2px", marginRight: 4 }} />
              Scambia un pasto
            </button>
          )}
        </div>
      </div>

      {/* ---------- UPLOAD (aperto da "Carica settimana", o sempre se manca la dieta) ---------- */}
      {(uploadOpen || !hasDiet) && (
        <UploadPanel
          onDone={() => {
            setUploadOpen(false);
            router.refresh();
          }}
        />
      )}

      {/* ---------- OGGI ---------- */}
      {hasDiet && todayMeals.length > 0 && (
        <>
          <div className="agLbl">I pasti di oggi · tocca per spuntare</div>
          {todayMeals.map((meal, i) => (
            <TodayMeal
              key={i}
              meal={meal}
              onCommit={(optionIndex, newText) => commitSwap(todayKey, i, optionIndex, newText)}
            />
          ))}
        </>
      )}

      {/* ---------- PROSSIMI GIORNI ---------- */}
      {futureDays.length > 0 && (
        <>
          <div className="agLbl">Prossimi giorni</div>
          <div className="dayCar">
            {futureDays.map((k) => (
              <div className="dcard" key={k}>
                <div className="dk2">{DAY_FULL[k]}</div>
                <div
                  className="dv2"
                  style={{
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 5,
                    overflow: "hidden",
                  }}
                >
                  {(week![k] ?? [])
                    .map((m) => (m.opzioni.length > 0 ? m.opzioni[0] : m.pasto))
                    .join(" · ")}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ---------- TBC + elimina ---------- */}
      {hasDiet && (
        <>
          <DeleteButton
            onDone={() => router.refresh()}
            onError={(m) => toast(m)}
          />
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Un pasto di oggi: .pRow spuntabile (tocca per barrare) + azione 🔄
 * che apre lo scambio alimento reale.
 * ------------------------------------------------------------------ */
function TodayMeal({
  meal,
  onCommit,
}: {
  meal: DietMeal;
  onCommit: (optionIndex: number, newText: string) => Promise<void>;
}) {
  const [done, setDone] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const Icon = iconForMeal(meal.pasto);
  const first = meal.opzioni.length > 0 ? meal.opzioni[0] : "";
  const many = meal.opzioni.length > 1;
  const canSwap = meal.opzioni.length > 0;

  return (
    <div>
      {/* card scura coerente (niente più pill bianca), 2 righe: tipo pasto + contenuto completo */}
      <div
        onClick={() => setDone((d) => !d)}
        style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 14, background: "var(--card)", border: "1px solid var(--card-line)", borderRadius: 16, marginBottom: 10, cursor: "pointer", opacity: done ? 0.55 : 1 }}
      >
        <span style={{ display: "inline-flex", color: "var(--accent)", marginTop: 2, flex: "none" }}>
          <Icon style={{ width: 20, height: 20 }} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".5px", textTransform: "uppercase", color: "var(--text-3)" }}>{meal.pasto}</div>
          <div style={{ fontSize: 15, color: "var(--text)", marginTop: 3, lineHeight: 1.3, textDecoration: done ? "line-through" : "none", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{first || "—"}</div>
          {many && <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>{meal.opzioni.length} opzioni</div>}
        </div>
        {canSwap && (
          <button
            type="button"
            aria-label="Scambia un alimento"
            onClick={(e) => { e.stopPropagation(); setSwapOpen((o) => !o); }}
            style={{ flex: "none", width: 34, height: 34, borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", background: swapOpen ? "var(--accent-soft)" : "rgba(255,255,255,.05)", color: swapOpen ? "var(--accent)" : "var(--text-2)", border: "1px solid var(--card-line)", cursor: "pointer" }}
          >
            <RefreshCw style={{ width: 15, height: 15 }} />
          </button>
        )}
      </div>
      {swapOpen && <DietSwap meal={meal} onCommit={onCommit} onClose={() => setSwapOpen(false)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Upload settimana (foto/PDF) — stessa logica di prima, veste keiko.
 * ------------------------------------------------------------------ */
type UploadState = "idle" | "parsing" | "success" | "error";

function UploadPanel({ onDone }: { onDone: () => void }) {
  const [images, setImages] = useState<File[]>([]);
  const [pdf, setPdf] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [note, setNote] = useState("");
  const imgRef = useRef<HTMLInputElement | null>(null);
  const pdfRef = useRef<HTMLInputElement | null>(null);
  const hasSomething = images.length > 0 || pdf !== null;

  function resetSelection() {
    setImages([]);
    setPdf(null);
    if (imgRef.current) imgRef.current.value = "";
    if (pdfRef.current) pdfRef.current.value = "";
  }

  async function handleUpload() {
    if (!hasSomething) return;
    setState("parsing");
    setNote("");
    const fd = new FormData();
    for (const img of images) fd.append("images", img);
    if (pdf) fd.append("pdf", pdf);
    try {
      const res = await fetch("/api/diet/upload", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Qualcosa non torna");
      setNote(typeof data.note === "string" ? data.note : "");
      setState("success");
      resetSelection();
      setTimeout(() => {
        setState("idle");
        onDone();
      }, 1400);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Qualcosa non torna");
      setState("error");
    }
  }

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--card-line)",
        borderRadius: "var(--r-xl)",
        boxShadow: "var(--shadow)",
        padding: 15,
        marginTop: 12,
      }}
    >
      {state === "idle" && (
        <>
          <div style={{ fontSize: "var(--fs-md)", fontWeight: 800, color: "var(--text)" }}>Carica o aggiorna la dieta</div>
          <p style={{ fontSize: "var(--fs-xs)", color: "var(--text-2)", marginTop: 3, lineHeight: 1.45 }}>
            Foto del piano e/o un PDF: ci penso io a leggerlo.
          </p>

          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <SourceButton Icon={ImagePlus} label={images.length > 0 ? `${images.length} foto` : "Foto"} active={images.length > 0} onClick={() => imgRef.current?.click()} />
            <SourceButton Icon={FileText} label={pdf ? "PDF pronto" : "PDF"} active={pdf !== null} onClick={() => pdfRef.current?.click()} />
          </div>

          <input ref={imgRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => setImages(e.target.files ? Array.from(e.target.files) : [])} />
          <input ref={pdfRef} type="file" accept="application/pdf" style={{ display: "none" }} onChange={(e) => setPdf(e.target.files?.[0] ?? null)} />

          {hasSomething && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 11 }}>
              {images.length > 0 && <FileChip label={`${images.length} foto`} onClear={() => { setImages([]); if (imgRef.current) imgRef.current.value = ""; }} />}
              {pdf && <FileChip label={pdf.name} onClear={() => { setPdf(null); if (pdfRef.current) pdfRef.current.value = ""; }} />}
            </div>
          )}

          <button type="button" className="btn acc" onClick={handleUpload} disabled={!hasSomething} style={{ width: "100%", marginTop: 14, opacity: hasSomething ? 1 : 0.45 }}>
            <Camera style={{ width: 15, height: 15 }} />
            Leggi la dieta
          </button>
        </>
      )}

      {state === "parsing" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "22px 0" }}>
          <Loader2 style={{ width: 26, height: 26, color: "var(--accent)" }} className="k-spin" />
          <p style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--text-2)" }}>Keiko sta leggendo…</p>
        </div>
      )}

      {state === "success" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "22px 0", textAlign: "center" }}>
          <Check style={{ width: 30, height: 30, color: "var(--accent)" }} />
          <p style={{ fontSize: "var(--fs-sm)", fontWeight: 800, color: "var(--text)" }}>Dieta aggiornata</p>
          {note && <p style={{ fontSize: "var(--fs-xs)", color: "var(--text-2)", lineHeight: 1.45 }}>{note}</p>}
        </div>
      )}

      {state === "error" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "22px 0", textAlign: "center" }}>
          <p style={{ fontSize: "var(--fs-sm)", color: "var(--text-2)" }}>{errorMsg}</p>
          <button type="button" onClick={() => setState("idle")} style={{ background: "none", border: 0, color: "var(--accent)", fontWeight: 800, fontSize: "var(--fs-sm)", cursor: "pointer" }}>
            Riprovo
          </button>
        </div>
      )}
    </div>
  );
}

function SourceButton({ Icon, label, active, onClick }: { Icon: LucideIcon; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        minHeight: 74,
        borderRadius: "var(--r-md)",
        background: active ? "var(--accent-soft)" : "var(--bg-2)",
        border: active ? "1px solid var(--accent)" : "1px dashed var(--card-line)",
        color: active ? "var(--accent)" : "var(--text-2)",
        cursor: "pointer",
        fontFamily: "var(--f)",
      }}
    >
      <Icon style={{ width: 22, height: 22 }} />
      <span style={{ fontSize: "var(--fs-xs)", fontWeight: 800 }}>{label}</span>
    </button>
  );
}

function FileChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span
      style={{
        display: "inline-flex",
        maxWidth: "100%",
        alignItems: "center",
        gap: 6,
        background: "var(--bg-2)",
        border: "1px solid var(--card-line)",
        borderRadius: "var(--r-pill)",
        padding: "5px 6px 5px 11px",
        fontSize: "var(--fs-xs)",
        fontWeight: 700,
        color: "var(--text)",
      }}
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label="Rimuovi"
        style={{ display: "grid", placeItems: "center", width: 20, height: 20, flex: "none", borderRadius: "50%", border: 0, background: "var(--card-line)", color: "var(--text-2)", cursor: "pointer" }}
      >
        <X style={{ width: 12, height: 12 }} />
      </button>
    </span>
  );
}

function DeleteButton({ onDone, onError }: { onDone: () => void; onError: (m: string) => void }) {
  const [deleting, setDeleting] = useState(false);
  async function handleDelete() {
    if (!window.confirm("Eliminare la dieta salvata? L'azione non si può annullare.")) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/diet/delete", { method: "POST", credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Eliminazione fallita");
      }
      onDone();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Eliminazione fallita");
    } finally {
      setDeleting(false);
    }
  }
  return (
    <button
      type="button"
      className="btn line"
      onClick={handleDelete}
      disabled={deleting}
      style={{ width: "100%", marginTop: 12, color: "#E25549", borderColor: "color-mix(in srgb,#E25549 40%,transparent)", opacity: deleting ? 0.6 : 1 }}
    >
      <Trash2 style={{ width: 15, height: 15 }} />
      {deleting ? "Elimino…" : "Elimina dieta"}
    </button>
  );
}
