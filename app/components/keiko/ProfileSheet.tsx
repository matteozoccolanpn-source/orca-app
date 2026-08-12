"use client";

/* IL PROFILO — l'unico foglio che si ripensa, non solo si riveste.
 *
 * Era cresciuto per accumulo: undici voci in fila, in ordine sparso, ognuna
 * con la sua riga e il suo bottone. Adesso sono CINQUE GRUPPI, ognuno col suo
 * titolo, e ogni voce sta dove uno andrebbe a cercarla:
 *
 *   Tu             il tuo nome · la tua città
 *   Le tue cose    allenamento e dieta · i tuoi abbonamenti
 *   Notifiche      le notifiche · i passaggi · i battiti · una prova
 *   Keiko          come funziona
 *   Privacy e dati i consensi · i tuoi dati
 *
 * E in fondo, staccate e terziarie, le due che non si premono per sbaglio:
 * «Esci» e «Cancella tutto».
 *
 * LE CHIAMATE NON CAMBIANO: /api/profile, /api/consents, /api/push/test,
 * /api/account/delete. Qui è cambiato dove stanno le cose e come si vedono. */

import { useEffect, useState, type ReactNode } from "react";
import { checkNotifications, enableNotifications, disableNotifications, isIos } from "@/lib/push-client";
import { daIcona, dimenticaRinvio } from "@/lib/install-client";
import ProfiloForm, { type ProfiloValori } from "./ProfiloForm";
import InstallSheet from "./InstallSheet";
import { Sheet, K2_FOGLIO } from "@/app/components/v2/Sheet";
import { Sec } from "@/app/components/v2/Sec";
import { I } from "@/app/components/v2/icons";

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
  const [abbOpen, setAbbOpen] = useState(false);
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

  /* K4 — «cancella tutti i miei dati». Registro serio (docs/UI-VOICE.md §2):
     niente emoji, niente battute.
     La conferma è a DUE TOCCHI, dentro il foglio: il primo arma e scrive cosa
     sta per succedere, il secondo cancella. Mai `window.confirm`, che è una
     finestra del browser e non sa niente di noi. Il primo tocco si disarma da
     solo se cambi idea (basta toccare «Lascia stare»), e la parola CANCELLA
     resta comunque obbligatoria dalla parte del server. */
  const [delArmato, setDelArmato] = useState(false);
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
        if (r.ok) { dimenticaRinvio(); setNotif(true); setNotifMsg("Notifiche attive."); }
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
      if (res.ok && d.sent > 0) setNotifMsg("Prova inviata: dovrebbe arrivarti tra un istante.");
      else if (d.reason === "no-subscriptions") setNotifMsg("Nessuna iscrizione: attiva prima le notifiche.");
      else setNotifMsg("Non inviata (nessun dispositivo raggiunto). Riattiva le notifiche e riprova.");
    } catch {
      setNotifMsg("Errore nell'invio della prova.");
    } finally {
      setNotifBusy(false);
    }
  }

  async function cambiaBattiti() {
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
  }

  return (
    <div className="k2" style={K2_FOGLIO}>
      <Sheet onClose={onClose}>
        <div className="plain-head">
          <h2>Profilo</h2>
          <div className="status">Quello che Keiko sa di te, e cosa può fare</div>
        </div>

        <div className="pad">
          {/* ═══════ TU ═══════ */}
          <Sec sm="servono a salutarti e a darti il meteo giusto">Tu</Sec>
          <div className="srf" style={{ padding: "4px 12px 12px" }}>
            <Campo
              etichetta="Il tuo nome"
              sotto="Keiko lo usa per salutarti in home."
              valore={name}
              onValore={onName}
              segnaposto="Il tuo nome"
            />
            {onCity && (
              <Campo
                etichetta="La tua città"
                sotto="Per il meteo di oggi nella home."
                valore={city ?? ""}
                onValore={onCity}
                segnaposto="Es. Milano"
              />
            )}
          </div>

          {/* ═══════ LE TUE COSE ═══════ */}
          <Sec sm="quello che Keiko usa per prepararti le cose">Le tue cose</Sec>
          <div className="srf">
            <Riga
              icona={I.dumb({ s: 16 })}
              titolo="Allenamento e dieta"
              meta="Obiettivo, livello, sessioni, vincoli"
              aperta={fitOpen}
              onClick={openFit}
            />
            {fitOpen && (
              <div style={{ padding: "0 12px 12px" }}>
                {fitData === "loading" ? (
                  <p className="status">Carico il profilo…</p>
                ) : (
                  <ProfiloForm
                    initial={fitData}
                    saveLabel="Salva modifiche"
                    onSaved={() => { setFitOpen(false); setFitMsg("Profilo aggiornato: la prossima scheda generata ne terrà conto."); }}
                  />
                )}
              </div>
            )}
            {fitMsg && <p className="status" style={{ padding: "0 12px 12px" }}>{fitMsg}</p>}

            <Riga
              icona={I.tv({ s: 16 })}
              titolo="I tuoi abbonamenti"
              meta={
                abbonamenti === null ? "Carico…"
                  : abbonamenti.length === 0 ? "Nessuno: te li chiedo quando cerchi un titolo"
                  : abbonamenti.join(" · ")
              }
              aperta={abbOpen}
              onClick={() => setAbbOpen((v) => !v)}
            />
            {abbOpen && (
              <div style={{ padding: "0 12px 12px" }}>
                <p className="status" style={{ marginTop: 0 }}>
                  Così quando cerchi un titolo ti dico dove ce l&apos;hai già, invece di mandarti a pagare.
                </p>
                {abbonamenti === null ? (
                  <p className="status">Carico…</p>
                ) : (
                  <div className="chips" style={{ flexWrap: "wrap", marginTop: 10, overflow: "visible" }}>
                    {piattaforme.map((p) => {
                      const on = abbonamenti.includes(p);
                      return (
                        <button
                          key={p}
                          className={"chip tap" + (on ? " on" : "")}
                          onClick={() => cambiaAbbonamento(p)}
                          role="checkbox"
                          aria-checked={on}
                          style={{ minHeight: 44 }}
                        >
                          {on && I.tick({ s: 12 })}{p}
                        </button>
                      );
                    })}
                  </div>
                )}
                {abbMsg && <p className="status">{abbMsg}</p>}
              </div>
            )}
          </div>

          {/* ═══════ NOTIFICHE ═══════ */}
          <Sec sm="cosa ti arriva sul telefono, e quando">Notifiche</Sec>
          <div className="srf">
            <RigaInterruttore
              icona={I.bolt({ s: 16 })}
              titolo="Notifiche"
              meta={serveGuida ? "Prima aggiungimi alla tua schermata Home" : "Promemoria di eventi e to-do"}
              on={notif}
              busy={notifBusy}
              onToggle={toggleNotif}
            />
            {serveGuida && !notif && (
              <Riga
                icona={I.info({ s: 16 })}
                titolo="Mostrami i passaggi"
                meta="Come aggiungere Keiko alla schermata Home"
                onClick={() => setGuida(true)}
              />
            )}
            {/* I BATTITI (docs/SPEC-BATTITI.md): questo spegne solo le notifiche.
                Le card in home continuano a esserci — l'interruttore chiude il
                canale, la ✕ sulla card chiude quel battito. */}
            <RigaInterruttore
              icona={I.flame({ s: 16 })}
              titolo="Battiti"
              meta="Ti ricordo un evento prima e dopo. In home restano comunque."
              on={battiti}
              busy={battitiBusy}
              onToggle={cambiaBattiti}
            />
            {notif && (
              <Riga
                icona={I.play({ s: 16 })}
                titolo="Invia una prova"
                meta="Per vedere se arrivano davvero"
                onClick={testNotif}
              />
            )}
          </div>
          {notifMsg && <p className="status">{notifMsg}</p>}

          {/* ═══════ KEIKO ═══════ */}
          {onRivediOnboarding && (
            <>
              <Sec>Keiko</Sec>
              <div className="srf">
                <Riga
                  icona={I.orca(16)}
                  titolo="Come funziona Keiko"
                  meta="Rivedi la presentazione dall'inizio"
                  onClick={onRivediOnboarding}
                />
              </div>
            </>
          )}

          {/* ═══════ PRIVACY E DATI ═══════ */}
          <Sec sm="li togli quando vuoi, anche subito">Privacy e dati</Sec>
          <div className="srf">
            {consensi === null ? (
              <p className="status" style={{ padding: 12, margin: 0 }}>Carico…</p>
            ) : (
              <>
                <RigaInterruttore
                  icona={I.tick({ s: 16 })}
                  titolo="Dieta e allenamento"
                  meta="Dati di salute. Senza, quelle due sezioni non si usano; il resto funziona."
                  on={consensi.salute}
                  busy={consBusy === "salute"}
                  onToggle={() => cambiaConsenso("salute")}
                />
                <RigaInterruttore
                  icona={I.mic({ s: 16 })}
                  titolo="Avvisami per email"
                  meta="Solo quando aggiungo qualcosa che ti serve."
                  on={consensi.email}
                  busy={consBusy === "email"}
                  onToggle={() => cambiaConsenso("email")}
                />
              </>
            )}
            <div className="row-act" style={{ cursor: "default" }}>
              <span className="ic2">{I.doc({ s: 16 })}</span>
              <span className="in">
                <span className="t">I tuoi dati</span>
                <span className="m">
                  Eventi, to-do, dieta, allenamento, viaggi, watchlist, profilo e notifiche:
                  tutto quello che Keiko sa di te.
                </span>
              </span>
            </div>
          </div>
          {consMsg && <p className="status">{consMsg}</p>}

          {/* ═══════ IN FONDO, STACCATE ═══════
              Non sono un gruppo: sono le due cose che non si premono per
              sbaglio, e stanno da sole in fondo apposta. Terziarie: nessuna
              delle due è l'azione di questa schermata. */}
          <div style={{ marginTop: 28, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
            {logoutAction && (
              <form action={logoutAction}>
                <button type="submit" className="tert tap" style={{ width: "100%", minHeight: 44 }}>Esci</button>
              </form>
            )}

            {!delArmato ? (
              <button
                onClick={() => { setDelArmato(true); setDelMsg(null); }}
                className="tert tap"
                style={{ width: "100%", minHeight: 44, marginTop: 4, color: "#E57373" }}
              >
                Cancella tutto
              </button>
            ) : (
              /* Il secondo tocco. Qui c'è scritto cosa sparisce e che non si
                 torna indietro: chi arriva al secondo tocco l'ha letto. */
              <div className="srf2" style={{ marginTop: 8, padding: 14, borderColor: "rgba(229,115,115,.35)" }}>
                <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.01em" }}>Cancello tutto?</div>
                <p className="status">
                  Spariscono i tuoi eventi, i to-do, la dieta, l&apos;allenamento, i viaggi, la
                  watchlist, il profilo e le notifiche. Non si torna indietro: dopo non posso
                  ripescarli.
                </p>
                <div className="pactions" style={{ marginTop: 14 }}>
                  <button
                    onClick={deleteAll}
                    disabled={delBusy || delDone}
                    className="btn2 tap"
                    style={{ flex: 1, justifyContent: "center", color: "#E57373", borderColor: "rgba(229,115,115,.35)", opacity: delBusy || delDone ? 0.45 : 1 }}
                  >
                    {delBusy ? "Sto cancellando…" : "Sì, cancella tutto"}
                  </button>
                  <button
                    onClick={() => { setDelArmato(false); setDelMsg(null); }}
                    disabled={delBusy || delDone}
                    className="btn2 tap"
                    style={{ flex: 1, justifyContent: "center" }}
                  >
                    Lascia stare
                  </button>
                </div>
              </div>
            )}
            {delMsg && <p className="status">{delMsg}</p>}
          </div>
        </div>
      </Sheet>

      {/* K15: la guida resta raggiungibile da qui per sempre, anche per chi ha
          chiuso l'invito automatico. */}
      {guida && (
        <InstallSheet
          modo="guida-ios"
          zIndex={96}
          onClose={() => { setGuida(false); checkNotifications().then(setNotif); }}
        />
      )}
    </div>
  );
}

/* ── i pezzi di cui è fatto il foglio ─────────────────────────────────────── */

/** Una riga-azione del sistema: icona quadrata, titolo, metadato, chevron.
 *  Se `aperta` è definita la chevron ruota invece di puntare a destra: quella
 *  riga apre qualcosa QUI DENTRO, non porta via. */
function Riga({ icona, titolo, meta, onClick, aperta }: {
  icona: ReactNode; titolo: string; meta: string; onClick: () => void; aperta?: boolean;
}) {
  return (
    <div className="row-act tap" onClick={onClick} role="button">
      <span className="ic2">{icona}</span>
      <span className="in">
        <span className="t">{titolo}</span>
        <span className="m">{meta}</span>
      </span>
      {I.chev({ c: "chev", st: aperta === undefined ? { transform: "rotate(-90deg)" } : aperta ? { transform: "rotate(180deg)" } : undefined })}
    </div>
  );
}

/** Una riga con l'interruttore. L'acceso è teal, come ogni «sì» del sistema. */
function RigaInterruttore({ icona, titolo, meta, on, busy, onToggle }: {
  icona: ReactNode; titolo: string; meta: string; on: boolean; busy: boolean; onToggle: () => void;
}) {
  return (
    <div className="row-act" style={{ cursor: "default" }}>
      <span className="ic2">{icona}</span>
      <span className="in">
        <span className="t">{titolo}</span>
        <span className="m">{meta}</span>
      </span>
      <button
        onClick={onToggle}
        disabled={busy}
        role="switch"
        aria-checked={on}
        aria-label={titolo}
        className="tap"
        style={{
          width: 48, height: 28, borderRadius: 999, flex: "none", cursor: "pointer", position: "relative",
          background: on ? "var(--teal)" : "var(--lv2)",
          border: `1px solid ${on ? "var(--teal)" : "rgba(255,255,255,.12)"}`,
          opacity: busy ? 0.5 : 1, transition: "background .16s",
        }}
      >
        <span style={{
          position: "absolute", top: 2, left: on ? 22 : 2, width: 22, height: 22, borderRadius: "50%",
          background: on ? "var(--on-teal)" : "var(--meta)", transition: "left .16s",
        }} />
      </button>
    </div>
  );
}

/** Un campo di testo con la sua etichetta e la riga che spiega a cosa serve. */
function Campo({ etichetta, sotto, valore, onValore, segnaposto }: {
  etichetta: string; sotto: string; valore: string; onValore: (v: string) => void; segnaposto: string;
}) {
  return (
    <div style={{ paddingTop: 12 }}>
      <label className="status" style={{ display: "block", marginTop: 0, marginBottom: 6 }}>{etichetta}</label>
      <input
        value={valore}
        onChange={(e) => onValore(e.target.value)}
        placeholder={segnaposto}
        /* 16px: sotto i 16 iOS ingrandisce la pagina al primo tocco e non
           torna più indietro. */
        style={{
          width: "100%", background: "var(--lv2)", border: "1px solid rgba(255,255,255,.09)",
          borderRadius: "var(--r-in)", boxShadow: "inset 0 1px 0 var(--hl)",
          padding: "12px 14px", color: "var(--txt)", fontSize: 16, fontFamily: "inherit",
          outline: 0, boxSizing: "border-box",
        }}
      />
      <p className="status">{sotto}</p>
    </div>
  );
}
