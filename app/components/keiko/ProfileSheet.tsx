"use client";

/* Profilo (design v4): nome (per i saluti, salvato sul dispositivo) + logout.
   Il logout riusa la server action passata dalla pagina (come la Home vecchia).
   Aggiunto (v4): interruttore Notifiche — prima stava solo nella vecchia HomeView,
   quindi nella home v4 non c'era modo di iscriversi (= notifiche mai ricevute). */
import { useEffect, useState } from "react";
import { checkNotifications, enableNotifications, disableNotifications, isIos } from "@/lib/push-client";

export default function ProfileSheet({
  name, onName, city, onCity, onClose, logoutAction,
}: {
  name: string;
  onName: (v: string) => void;
  city?: string;
  onCity?: (v: string) => void;
  onClose: () => void;
  logoutAction?: () => Promise<void>;
}) {
  const [notif, setNotif] = useState(false);
  const [notifBusy, setNotifBusy] = useState(false);
  const [notifMsg, setNotifMsg] = useState<string | null>(null);
  const [ios, setIos] = useState(false);
  useEffect(() => { setIos(isIos()); checkNotifications().then(setNotif); }, []);

  async function toggleNotif() {
    setNotifBusy(true); setNotifMsg(null);
    try {
      if (notif) {
        await disableNotifications();
        setNotif(false); setNotifMsg("Notifiche disattivate.");
      } else {
        const r = await enableNotifications();
        if (r.ok) { setNotif(true); setNotifMsg("Notifiche attive ✅"); }
        else if (r.error === "ios-install") setNotifMsg("Su iPhone: installa Keiko (Condividi → Aggiungi a Home) e attiva da lì.");
        else if (r.error === "denied") setNotifMsg("Permesso negato dal browser.");
        else if (r.error === "no-key") setNotifMsg("Config VAPID mancante nella build.");
        else if (r.error === "unsupported") setNotifMsg("Notifiche non supportate qui.");
        else setNotifMsg("Errore salvataggio (" + r.error + ").");
      }
    } catch (e) {
      setNotifMsg("Errore: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setNotifBusy(false);
    }
  }

  async function testNotif() {
    setNotifBusy(true); setNotifMsg(null);
    try {
      const res = await fetch("/api/push/test", { method: "POST", credentials: "include" });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.sent > 0) setNotifMsg("Prova inviata! Dovrebbe arrivarti tra un istante 🔔");
      else if (d.reason === "no-subscriptions") setNotifMsg("Nessuna iscrizione: premi prima Attiva.");
      else setNotifMsg("Non inviata (nessun dispositivo raggiunto). Riattiva le notifiche e riprova.");
    } catch {
      setNotifMsg("Errore nell'invio della prova.");
    } finally {
      setNotifBusy(false);
    }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 92, background: "rgba(0,0,0,.62)", display: "flex", alignItems: "flex-end" }}>
      <div
        className="ds"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 440, margin: "0 auto", background: "var(--k-bg)", borderTopLeftRadius: 24, borderTopRightRadius: 24, boxShadow: "0 -8px 40px rgba(0,0,0,.5)", borderTop: "1px solid rgba(255,255,255,.06)", padding: "12px 20px calc(env(safe-area-inset-bottom) + 24px)" }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,.2)", margin: "0 auto 16px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg,#3a2f22,#241d15)", border: "1px solid var(--k-line)", display: "grid", placeItems: "center", fontSize: 20 }}>🐋</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--k-text)", margin: 0 }}>Profilo</h2>
          <button onClick={onClose} aria-label="Chiudi" style={{ marginLeft: "auto", width: 32, height: 32, borderRadius: "50%", background: "var(--k-surface)", border: "1px solid var(--k-line)", color: "var(--k-text-2)", fontSize: 14, cursor: "pointer" }}>✕</button>
        </div>

        <label style={{ display: "block", fontSize: 12.5, color: "var(--k-text-3)", margin: "0 2px 6px" }}>Il tuo nome</label>
        <input
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder="Il tuo nome"
          style={{ width: "100%", background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 12, padding: "12px 14px", color: "var(--k-text)", fontSize: 15, fontFamily: "inherit", outline: 0 }}
        />
        <p style={{ fontSize: 12.5, color: "var(--k-text-3)", margin: "8px 2px 0" }}>Keiko lo usa per salutarti in home.</p>

        {onCity && (
          <>
            <label style={{ display: "block", fontSize: 12.5, color: "var(--k-text-3)", margin: "18px 2px 6px" }}>La tua città</label>
            <input
              value={city ?? ""}
              onChange={(e) => onCity(e.target.value)}
              placeholder="Es. Milano"
              style={{ width: "100%", background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 12, padding: "12px 14px", color: "var(--k-text)", fontSize: 15, fontFamily: "inherit", outline: 0 }}
            />
            <p style={{ fontSize: 12.5, color: "var(--k-text-3)", margin: "8px 2px 0" }}>Per il meteo di oggi nella home.</p>
          </>
        )}

        <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--k-line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--k-text)" }}>Notifiche</div>
              <div style={{ fontSize: 12.5, color: "var(--k-text-3)", marginTop: 2 }}>Promemoria di eventi e to-do{ios ? " · su iPhone installa Keiko dalla Home" : ""}</div>
            </div>
            <button onClick={toggleNotif} disabled={notifBusy} className={`ds-btn${notif ? "" : " primary"}`} style={{ height: 40, padding: "0 16px", fontSize: 13, opacity: notifBusy ? 0.5 : 1, flex: "none" }}>
              {notifBusy ? "…" : notif ? "Attive ✓" : "Attiva"}
            </button>
          </div>
          {notif && (
            <button onClick={testNotif} disabled={notifBusy} style={{ background: "none", border: 0, color: "var(--k-accent)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", marginTop: 10, padding: "2px 2px" }}>Invia notifica di prova</button>
          )}
          {notifMsg && <p style={{ fontSize: 12.5, color: "var(--k-text-2)", margin: "10px 2px 0" }}>{notifMsg}</p>}
        </div>

        {logoutAction && (
          <form action={logoutAction} style={{ marginTop: 26 }}>
            <button type="submit" className="ds-btn" style={{ width: "100%", height: 48 }}>Esci</button>
          </form>
        )}
      </div>
    </div>
  );
}
