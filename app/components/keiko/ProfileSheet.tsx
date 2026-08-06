"use client";

/* Profilo (design v4): nome (per i saluti, salvato sul dispositivo) + logout.
   Il logout riusa la server action passata dalla pagina (come la Home vecchia).
   Aggiunto (v4): interruttore Notifiche — prima stava solo nella vecchia HomeView,
   quindi nella home v4 non c'era modo di iscriversi (= notifiche mai ricevute). */
import { useEffect, useState } from "react";
import { checkNotifications, enableNotifications, disableNotifications, isIos } from "@/lib/push-client";
import { daIcona, dimenticaRinvio } from "@/lib/install-client";
import ProfiloForm, { type ProfiloValori } from "./ProfiloForm";
import InstallSheet from "./InstallSheet";
import SheetShell from "./SheetShell";

export default function ProfileSheet({
  name, onName, city, onCity, onClose, logoutAction, onRivediOnboarding,
}: {
  name: string;
  onName: (v: string) => void;
  city?: string;
  onCity?: (v: string) => void;
  onClose: () => void;
  logoutAction?: () => Promise<void>;
  /** Rifà l'onboarding da capo (utile per le prove e per chi non ha capito). */
  onRivediOnboarding?: () => void;
}) {
  const [notif, setNotif] = useState(false);
  const [notifBusy, setNotifBusy] = useState(false);
  const [notifMsg, setNotifMsg] = useState<string | null>(null);
  const [ios, setIos] = useState(false);
  // K15: su iPhone dal browser gli avvisi NON si possono attivare. Invece di
  // farli fallire, il tasto apre la guida. `daHome` parte a true così, nel
  // primo istante prima del controllo, non lampeggia la guida a chi non serve.
  const [daHome, setDaHome] = useState(true);
  const [guida, setGuida] = useState(false);
  useEffect(() => { setIos(isIos()); setDaHome(daIcona()); checkNotifications().then(setNotif); }, []);
  const serveGuida = ios && !daHome;

  // Consensi (K2/K14): qui si REVOCANO. Si caricano all'apertura del pannello,
  // così lo stato mostrato è quello vero del database, non un'ipotesi.
  const [consensi, setConsensi] = useState<{ salute: boolean; email: boolean } | null>(null);
  const [consBusy, setConsBusy] = useState<string | null>(null);
  const [consMsg, setConsMsg] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/consents", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const lista = (d?.consensi ?? []) as { tipo: string; accettato: boolean }[];
        setConsensi({
          salute: lista.some((x) => x.tipo === "salute" && x.accettato),
          email: lista.some((x) => x.tipo === "email" && x.accettato),
        });
      })
      .catch(() => setConsensi({ salute: false, email: false }));
  }, []);

  async function cambiaConsenso(tipo: "salute" | "email") {
    if (!consensi) return;
    const nuovo = !consensi[tipo];
    setConsBusy(tipo); setConsMsg(null);
    setConsensi({ ...consensi, [tipo]: nuovo });          // risposta immediata al tocco
    try {
      const res = await fetch("/api/consents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tipo, accettato: nuovo }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setConsensi({ ...consensi, [tipo]: !nuovo });        // non è passata: torno com'era
      setConsMsg("Non sono riuscito a salvare. Riprovo?");
    } finally {
      setConsBusy(null);
    }
  }

  // Abbonamenti: servono alla ricerca in Guarda per dire "ce l'hai già su X"
  // invece di elencare piattaforme che l'utente non ha. Arrivano insieme al
  // profilo, quindi nessuna chiamata in più.
  const [abbonamenti, setAbbonamenti] = useState<string[] | null>(null);
  // Interruttore dei battiti: spegne SOLO le notifiche, le card in home restano.
  const [battiti, setBattiti] = useState(true);
  const [battitiBusy, setBattitiBusy] = useState(false);
  const [piattaforme, setPiattaforme] = useState<string[]>([]);
  const [abbMsg, setAbbMsg] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setAbbonamenti(Array.isArray(d?.platforms) ? d.platforms : []);
        setBattiti(d?.battiti !== false);
        setPiattaforme(Array.isArray(d?.piattaformeDisponibili) ? d.piattaformeDisponibili : []);
      })
      .catch(() => setAbbonamenti([]));
  }, []);

  async function cambiaAbbonamento(nome: string) {
    if (!abbonamenti) return;
    const prima = abbonamenti;
    const dopo = abbonamenti.includes(nome) ? abbonamenti.filter((x) => x !== nome) : [...abbonamenti, nome];
    setAbbonamenti(dopo); setAbbMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ platforms: dopo }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setAbbonamenti(prima);
      setAbbMsg("Non sono riuscito a salvare. Riprovo?");
    }
  }

  // Profilo allenamento & dieta (il "seme"): modificabile da qui per sempre,
  // anche dopo la generazione della scheda. Lazy: si carica quando apri la sezione.
  const [fitOpen, setFitOpen] = useState(false);
  const [fitData, setFitData] = useState<ProfiloValori | null | "loading">("loading");
  const [fitMsg, setFitMsg] = useState("");
  async function openFit() {
    const next = !fitOpen;
    setFitOpen(next);
    setFitMsg("");
    if (next && fitData === "loading") {
      try {
        const res = await fetch("/api/profile", { credentials: "include" });
        const d = await res.json();
        setFitData((d?.profile as ProfiloValori) ?? null);
      } catch {
        setFitData(null);
      }
    }
  }

  // K4 — "cancella tutti i miei dati". Registro serio (docs/UI-VOICE.md §2):
  // niente emoji, niente battute. Due passaggi: si apre la conferma e si scrive
  // CANCELLA a mano, così non si arriva qui con un tocco sbagliato.
  const [delOpen, setDelOpen] = useState(false);
  const [delWord, setDelWord] = useState("");
  const [delBusy, setDelBusy] = useState(false);
  const [delMsg, setDelMsg] = useState<string | null>(null);
  const [delDone, setDelDone] = useState(false);

  async function deleteAll() {
    setDelBusy(true); setDelMsg(null);
    let riuscito = false;
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ conferma: "CANCELLA" }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) {
        riuscito = true;
      } else {
        setDelMsg(d?.error ? String(d.error) : "Qualcosa non torna: i tuoi dati sono ancora al loro posto. Riprova.");
      }
    } catch {
      setDelMsg("Qualcosa non torna: i tuoi dati sono ancora al loro posto. Riprova.");
    } finally {
      setDelBusy(false);
    }
    if (!riuscito) return;

    // Il database è pulito. Restano le tracce su questo dispositivo: l'iscrizione
    // alle notifiche del browser e quello che sta nel telefono (nome, città, temi).
    setDelDone(true);
    setDelMsg("Fatto. Non ho più niente di tuo. Ti riporto all'accesso.");
    try { await disableNotifications(); } catch { /* la riga sul server è già sparita */ }
    try {
      for (const k of ["keiko-name", "keiko-city", "keiko-mood", "keiko-theme", "keiko-onboarded"]) {
        localStorage.removeItem(k);
      }
    } catch { /* niente localStorage: pazienza */ }
    if (logoutAction) await logoutAction();
    else window.location.href = "/login";
  }

  async function toggleNotif() {
    // Su iPhone dal browser il permesso non si può nemmeno chiedere: si apre la
    // guida, invece di sbattere in faccia un errore che non si può risolvere lì.
    if (!notif && serveGuida) { setGuida(true); return; }
    setNotifBusy(true); setNotifMsg(null);
    try {
      if (notif) {
        await disableNotifications();
        setNotif(false); setNotifMsg("Notifiche disattivate.");
      } else {
        const r = await enableNotifications();
        if (r.ok) { dimenticaRinvio(); setNotif(true); setNotifMsg("Notifiche attive ✅"); }
        else if (r.error === "ios-install") { setGuida(true); return; }
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
    <SheetShell onClose={onClose} zIndex={92}>
      <div style={{ padding: "0 20px" }}>
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
          style={{ width: "100%", background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 12, padding: "12px 14px", color: "var(--k-text)", fontSize: 16, fontFamily: "inherit", outline: 0 }}
        />
        <p style={{ fontSize: 12.5, color: "var(--k-text-3)", margin: "8px 2px 0" }}>Keiko lo usa per salutarti in home.</p>

        {onCity && (
          <>
            <label style={{ display: "block", fontSize: 12.5, color: "var(--k-text-3)", margin: "18px 2px 6px" }}>La tua città</label>
            <input
              value={city ?? ""}
              onChange={(e) => onCity(e.target.value)}
              placeholder="Es. Milano"
              style={{ width: "100%", background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 12, padding: "12px 14px", color: "var(--k-text)", fontSize: 16, fontFamily: "inherit", outline: 0 }}
            />
            <p style={{ fontSize: 12.5, color: "var(--k-text-3)", margin: "8px 2px 0" }}>Per il meteo di oggi nella home.</p>
          </>
        )}

        <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--k-line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--k-text)" }}>Notifiche</div>
              <div style={{ fontSize: 12.5, color: "var(--k-text-3)", marginTop: 2 }}>
                {serveGuida ? "Prima aggiungimi alla tua schermata Home" : "Promemoria di eventi e to-do"}
              </div>
            </div>
            <button onClick={toggleNotif} disabled={notifBusy} className={`ds-btn${notif ? "" : " primary"}`} style={{ height: 40, padding: "0 16px", fontSize: 13, opacity: notifBusy ? 0.5 : 1, flex: "none" }}>
              {notifBusy ? "…" : notif ? "Attive ✓" : serveGuida ? "Come si fa" : "Attiva"}
            </button>
          </div>
          {serveGuida && !notif && (
            <button onClick={() => setGuida(true)} style={{ background: "none", border: 0, color: "var(--k-accent)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", marginTop: 10, padding: "2px 2px" }}>Mostrami i passaggi</button>
          )}
          {notif && (
            <button onClick={testNotif} disabled={notifBusy} style={{ background: "none", border: 0, color: "var(--k-accent)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", marginTop: 10, padding: "2px 2px" }}>Invia notifica di prova</button>
          )}
          {notifMsg && <p style={{ fontSize: 12.5, color: "var(--k-text-2)", margin: "10px 2px 0" }}>{notifMsg}</p>}

          {/* I BATTITI (docs/SPEC-BATTITI.md): questo spegne solo le notifiche.
              Le card in home continuano a esserci — l'interruttore chiude il
              canale, la ✕ sulla card chiude quel battito. */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--k-line)" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--k-text)" }}>Battiti</div>
              <div style={{ fontSize: 12.5, color: "var(--k-text-3)", marginTop: 2 }}>
                Ti ricordo un evento prima e dopo. In home restano comunque.
              </div>
            </div>
            <button
              onClick={async () => {
                const nuovo = !battiti;
                setBattiti(nuovo);
                setBattitiBusy(true);
                try {
                  await fetch("/api/profile", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ battiti: nuovo }),
                  });
                } catch {
                  setBattiti(!nuovo);   // non è passata: torna com'era
                } finally {
                  setBattitiBusy(false);
                }
              }}
              disabled={battitiBusy}
              className={`ds-btn${battiti ? "" : " primary"}`}
              style={{ height: 40, padding: "0 16px", fontSize: 13, opacity: battitiBusy ? 0.5 : 1, flex: "none" }}
            >
              {battitiBusy ? "…" : battiti ? "Attivi ✓" : "Attiva"}
            </button>
          </div>
        </div>

        {/* Profilo allenamento & dieta — sempre modificabile, anche dopo la scheda generata */}
        <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--k-line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--k-text)" }}>Allenamento & dieta</div>
              <div style={{ fontSize: 12.5, color: "var(--k-text-3)", marginTop: 2 }}>Obiettivo, livello, sessioni, vincoli</div>
            </div>
            <button onClick={openFit} className="ds-btn" style={{ height: 40, padding: "0 16px", fontSize: 13, flex: "none" }}>
              {fitOpen ? "Chiudi" : "Modifica"}
            </button>
          </div>
          {fitOpen && (
            fitData === "loading" ? (
              <p style={{ fontSize: 12.5, color: "var(--k-text-3)", margin: "12px 2px 0" }}>Carico il profilo…</p>
            ) : (
              <div style={{ marginTop: 4 }}>
                <ProfiloForm
                  initial={fitData}
                  saveLabel="Salva modifiche"
                  onSaved={() => { setFitOpen(false); setFitMsg("Profilo aggiornato ✓ — la prossima scheda generata ne terrà conto."); }}
                />
              </div>
            )
          )}
          {fitMsg && <p style={{ fontSize: 12.5, color: "var(--k-text-2)", margin: "10px 2px 0" }}>{fitMsg}</p>}
        </div>

        {/* Abbonamenti — servono a Guarda per dire "ce l'hai già su X" */}
        <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--k-line)" }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--k-text)" }}>I tuoi abbonamenti</div>
          <div style={{ fontSize: 12.5, color: "var(--k-text-3)", marginTop: 2, lineHeight: 1.45 }}>
            Così quando cerchi un titolo ti dico dove ce l&apos;hai già, invece di mandarti a pagare.
          </div>
          {abbonamenti === null ? (
            <p style={{ fontSize: 12.5, color: "var(--k-text-3)", margin: "12px 2px 0" }}>Carico…</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {piattaforme.map((p) => {
                const on = abbonamenti.includes(p);
                return (
                  <button
                    key={p}
                    onClick={() => cambiaAbbonamento(p)}
                    role="checkbox"
                    aria-checked={on}
                    style={{
                      height: 44, padding: "0 14px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit",
                      fontSize: 13.5, fontWeight: on ? 700 : 500,
                      background: on ? "var(--k-accent)" : "var(--k-surface)",
                      border: `1px solid ${on ? "var(--k-accent)" : "var(--k-line)"}`,
                      color: on ? "var(--k-accent-ink)" : "var(--k-text-2)",
                    }}
                  >
                    {on ? "✓ " : ""}{p}
                  </button>
                );
              })}
            </div>
          )}
          {abbMsg && <p style={{ fontSize: 12.5, color: "var(--k-text-2)", margin: "10px 2px 0" }}>{abbMsg}</p>}
        </div>

        {/* Consensi — qui si tolgono. Nessuno dei due è obbligatorio. */}
        <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--k-line)" }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--k-text)" }}>Consensi</div>
          <div style={{ fontSize: 12.5, color: "var(--k-text-3)", marginTop: 2 }}>Li togli quando vuoi, anche subito</div>
          {consensi === null ? (
            <p style={{ fontSize: 12.5, color: "var(--k-text-3)", margin: "12px 2px 0" }}>Carico…</p>
          ) : (
            <>
              <RigaConsenso
                titolo="Dieta e allenamento"
                sotto="Dati di salute. Senza, quelle due sezioni non si usano; il resto funziona."
                on={consensi.salute}
                busy={consBusy === "salute"}
                onToggle={() => cambiaConsenso("salute")}
              />
              <RigaConsenso
                titolo="Avvisami per email"
                sotto="Solo quando aggiungo qualcosa che ti serve."
                on={consensi.email}
                busy={consBusy === "email"}
                onToggle={() => cambiaConsenso("email")}
              />
            </>
          )}
          {consMsg && <p style={{ fontSize: 12.5, color: "var(--k-text-2)", margin: "10px 2px 0" }}>{consMsg}</p>}
        </div>

        {/* Rivedere l'onboarding — utile per le prove e per chi non ha capito */}
        {onRivediOnboarding && (
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--k-line)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--k-text)" }}>Come funziona Keiko</div>
                <div style={{ fontSize: 12.5, color: "var(--k-text-3)", marginTop: 2 }}>Rivedi la presentazione dall&apos;inizio</div>
              </div>
              <button onClick={onRivediOnboarding} className="ds-btn" style={{ height: 40, padding: "0 16px", fontSize: 13, flex: "none" }}>Rivedi</button>
            </div>
          </div>
        )}

        {logoutAction && (
          <form action={logoutAction} style={{ marginTop: 26 }}>
            <button type="submit" className="ds-btn" style={{ width: "100%", height: 48 }}>Esci</button>
          </form>
        )}

        {/* K4 — i tuoi dati. Ultima sezione: si arriva qui apposta, non per caso. */}
        <div style={{ marginTop: 26, paddingTop: 18, borderTop: "1px solid var(--k-line)" }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--k-text)" }}>I tuoi dati</div>
          <div style={{ fontSize: 12.5, color: "var(--k-text-3)", marginTop: 2, lineHeight: 1.5 }}>
            Eventi, to-do, dieta, allenamento, viaggi, watchlist, profilo e notifiche: tutto quello che Keiko sa di te.
          </div>

          {!delOpen ? (
            <button
              onClick={() => { setDelOpen(true); setDelWord(""); setDelMsg(null); }}
              className="ds-btn"
              style={{ marginTop: 12, width: "100%", height: 44, fontSize: 13.5, color: "#e57373", borderColor: "rgba(229,115,115,.35)" }}
            >
              Cancella tutti i miei dati
            </button>
          ) : (
            <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: "var(--k-surface)", border: "1px solid rgba(229,115,115,.35)" }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--k-text)" }}>Cancello tutto?</div>
              <p style={{ fontSize: 12.5, color: "var(--k-text-2)", margin: "8px 0 0", lineHeight: 1.5 }}>
                Spariscono i tuoi eventi, i to-do, la dieta, l&apos;allenamento, i viaggi, la watchlist, il profilo e le notifiche.
                Non si torna indietro: dopo non posso ripescarli.
              </p>
              <label style={{ display: "block", fontSize: 12.5, color: "var(--k-text-3)", margin: "14px 2px 6px" }}>
                Scrivi CANCELLA per confermare
              </label>
              <input
                value={delWord}
                onChange={(e) => setDelWord(e.target.value)}
                placeholder="CANCELLA"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                disabled={delBusy || delDone}
                style={{ width: "100%", background: "var(--k-bg)", border: "1px solid var(--k-line)", borderRadius: 12, padding: "12px 14px", color: "var(--k-text)", fontSize: 16, fontFamily: "inherit", outline: 0 }}
              />
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button
                  onClick={() => { setDelOpen(false); setDelWord(""); setDelMsg(null); }}
                  disabled={delBusy || delDone}
                  className="ds-btn"
                  style={{ flex: 1, height: 44, fontSize: 13.5 }}
                >
                  Annulla
                </button>
                <button
                  onClick={deleteAll}
                  disabled={delWord.trim() !== "CANCELLA" || delBusy || delDone}
                  className="ds-btn"
                  style={{ flex: 1, height: 44, fontSize: 13.5, color: "#e57373", borderColor: "rgba(229,115,115,.35)", opacity: delWord.trim() !== "CANCELLA" || delBusy || delDone ? 0.45 : 1 }}
                >
                  {delBusy ? "Sto cancellando…" : "Cancella tutto"}
                </button>
              </div>
            </div>
          )}
          {delMsg && <p style={{ fontSize: 12.5, color: "var(--k-text-2)", margin: "10px 2px 0" }}>{delMsg}</p>}
        </div>
      </div>

      {/* K15: la guida resta raggiungibile da qui per sempre, anche per chi ha
          chiuso l'invito automatico. Sta sopra il Profilo (zIndex 92). */}
      {guida && (
        <InstallSheet
          modo="guida-ios"
          zIndex={96}
          onClose={() => { setGuida(false); checkNotifications().then(setNotif); }}
        />
      )}
    </SheetShell>
  );
}

/* Una riga di consenso: acceso/spento, con l'interruttore a destra.
   Toglierlo è un tocco solo — la revoca dev'essere facile quanto il consenso. */
function RigaConsenso({ titolo, sotto, on, busy, onToggle }: {
  titolo: string; sotto: string; on: boolean; busy: boolean; onToggle: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--k-text)" }}>{titolo}</div>
        <div style={{ fontSize: 12, color: "var(--k-text-3)", marginTop: 2, lineHeight: 1.45 }}>{sotto}</div>
      </div>
      <button
        onClick={onToggle}
        disabled={busy}
        role="switch"
        aria-checked={on}
        aria-label={titolo}
        style={{
          width: 48, height: 28, borderRadius: 999, flex: "none", cursor: "pointer", position: "relative",
          background: on ? "var(--k-accent)" : "var(--k-surface)",
          border: `1px solid ${on ? "var(--k-accent)" : "var(--k-line)"}`,
          opacity: busy ? 0.5 : 1, transition: "background .16s",
        }}
      >
        <span style={{ position: "absolute", top: 2, left: on ? 22 : 2, width: 22, height: 22, borderRadius: "50%", background: on ? "var(--k-accent-ink)" : "var(--k-text-3)", transition: "left .16s" }} />
      </button>
    </div>
  );
}
