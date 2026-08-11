"use client";

import { useEffect, useRef, useState, useCallback } from "react";

import { I } from "@/app/components/v2/icons";
import { Img } from "@/app/components/v2/Img";
import { Sec } from "@/app/components/v2/Sec";
import { Ask } from "@/app/components/v2/Ask";
import { Chip } from "@/app/components/v2/Chip";
import { Poster } from "@/app/components/v2/Poster";
import { Feature } from "@/app/components/v2/Feature";
import { Empty } from "@/app/components/v2/Empty";
import { Skeleton } from "@/app/components/v2/Skeleton";
import { Sheet } from "@/app/components/v2/Sheet";
import { SheetHero } from "@/app/components/v2/SheetHero";
import { Feedback } from "@/app/components/v2/Feedback";
import {
  CERCA,
  GUARDA_FOTO,
  P,
  PODCAST,
  TITOLI,
  type Risultato,
  type Titolo,
} from "@/app/components/v2/mockData";

/* ═══════════════════════════════════════════════════════════════════════
   ONDATA 1 — parità col mock, DATI FINTI.
   Porta una sola schermata (Guarda) sopra app/keiko-v2.css e i componenti di
   app/components/v2: serve a dimostrare che foglio e componenti reggono.
   Cucina, Allenamento, Viaggi e Home arrivano nelle ondate successive.
   Fonte: docs/mockups/keiko-v2-mock.html, function Guarda + function App.
   ═══════════════════════════════════════════════════════════════════════ */

/** una riga di risultato della ricerca (.res) */
function Res({
  r,
  onOpen,
  onAdd,
}: {
  r: Risultato;
  onOpen: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="res tap" onClick={onOpen}>
      <span className="pw">
        <b className="fb2" style={{ fontSize: "13px" }}>
          {r.t.slice(0, 2)}
        </b>
        <Img src={r.img} />
      </span>
      <span className="in">
        <span className="t">{r.t}</span>
        <span className="m">{r.m}</span>
        {r.ce ? (
          <span className="w">
            {I.tick({ s: 13 })}c’è su {r.dove}
          </span>
        ) : (
          <span className="w no">{r.dove}</span>
        )}
      </span>
      <span
        className="add tap"
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
      >
        {I.plus({ s: 16 })}
      </span>
    </div>
  );
}

type Ris = "cerca" | "consiglio" | "capped" | null;

/** una domanda corta e senza punto interrogativo è una ricerca, non un consiglio */
const cercaSecca = (t: string) => /^[a-z0-9 ]{2,18}$/i.test(t) && !t.includes("?");

function Guarda({
  toast,
  asks,
  setAsks,
}: {
  toast: (t: string) => void;
  asks: number;
  setAsks: (f: (a: number) => number) => void;
}) {
  const [q, setQ] = useState<string | null>(null);
  const [ris, setRis] = useState<Ris>(null);
  const [load, setLoad] = useState(false);
  const [filtro, setFiltro] = useState("da vedere");
  const [tipo, setTipo] = useState<"Film" | "Serie" | null>(null);
  const [sheet, setSheet] = useState<Titolo | Risultato | null>(null);

  const lista = TITOLI;
  const vis = lista.filter(
    (x) =>
      (filtro === "tutti" || (filtro === "visti" ? x.visto : !x.visto)) &&
      (!tipo || x.tipo === tipo),
  );

  function chiedi(t: string) {
    setAsks((a) => a + 1);
    setQ(t);
    const cerca = cercaSecca(t);
    setLoad(true);
    setRis(null);
    setTimeout(() => {
      setLoad(false);
      setRis(asks >= 3 ? "capped" : cerca ? "cerca" : "consiglio");
    }, 1600);
  }

  const chiudiPannello = () => {
    setQ(null);
    setRis(null);
  };

  return (
    <div className="screen">
      <div className="head">
        <div className="col">
          <h1>Guarda</h1>
          <div className="status">19 titoli</div>
        </div>
      </div>

      <div className="stag">
        {/* ── la barra, e sotto il pannello ── */}
        <div>
          <Ask
            placeholder="Cerca un titolo, o chiedimi cosa guardare…"
            onAsk={chiedi}
          />

          {q && (
            <div className="srf2 panel glow" style={{ marginTop: "8px" }}>
              <div className="ph-head">
                <span style={{ color: "var(--teal)", display: "flex" }}>
                  {I.orca(18)}
                </span>
                <span className="ph-q">{q}</span>
                <span className="chevhit tap" onClick={chiudiPannello}>
                  {I.close({ s: 15 })}
                </span>
              </div>

              {load && (
                <>
                  <div className="think">
                    <span className="orb" />
                    <span className="tx">
                      {cercaSecca(q)
                        ? "cerco nel catalogo…"
                        : "guardo cosa hai già e cosa ti è piaciuto…"}
                    </span>
                  </div>
                  <div className="bd" style={{ paddingTop: 0 }}>
                    <Skeleton rows={2} />
                  </div>
                </>
              )}

              {ris === "capped" && (
                <div className="bd">
                  <div className="hint warm" style={{ marginTop: 0 }}>
                    {I.info({ s: 14 })}
                    <p>
                      Per oggi mi fermo qui 🌙 — le richieste di oggi sono finite.{" "}
                      <b>Domani si riparte.</b>
                    </p>
                  </div>
                  <div className="pactions">
                    <button className="btn2 wide tap" onClick={chiudiPannello}>
                      Va bene
                    </button>
                  </div>
                </div>
              )}

              {ris === "cerca" && (
                <div className="bd" style={{ paddingTop: 0 }}>
                  <div
                    className="grp"
                    style={{ position: "static", margin: "0 -14px", padding: "10px 14px" }}
                  >
                    Nei tuoi abbonamenti
                    <span className="n">Netflix · Now · Prime · TIMVision</span>
                  </div>
                  <div className="stag">
                    {CERCA.filter((r) => r.ce).map((r, i) => (
                      <Res
                        key={i}
                        r={r}
                        onOpen={() => setSheet(r)}
                        onAdd={() => toast(r.t + " aggiunto alla lista")}
                      />
                    ))}
                  </div>
                  <div
                    className="grp"
                    style={{ position: "static", margin: "12px -14px 0", padding: "10px 14px" }}
                  >
                    Fuori abbonamento
                    <span className="n">ti avviso quando arrivano</span>
                  </div>
                  {CERCA.filter((r) => !r.ce).map((r, i) => (
                    <Res
                      key={i}
                      r={r}
                      onOpen={() => setSheet(r)}
                      onAdd={() => toast(r.t + " aggiunto alla lista")}
                    />
                  ))}
                </div>
              )}

              {ris === "consiglio" && (
                <div className="bd">
                  <Feature
                    img={GUARDA_FOTO.consiglio}
                    tone="dark"
                    dot="guarda"
                    k="film · 1 h 48 · thriller"
                    t="The Prestige"
                    m="Due illusionisti rivali si distruggono a vicenda per un trucco impossibile."
                    onClick={() => toast("Aperta la scheda")}
                  >
                    <div className="why">
                      {I.tick({ s: 13 })}ce l’hai su Netflix, e dura meno di due ore
                      <Feedback perche="Te lo propongo perché hai messo 5 a Interstellar e stasera hai poco tempo." />
                    </div>
                    <div className="row">
                      <button
                        className="cta tap"
                        onClick={(e) => {
                          e.stopPropagation();
                          toast("Aperto Netflix");
                        }}
                      >
                        Guardalo
                      </button>
                      <button
                        className="btn2 tap"
                        onClick={(e) => {
                          e.stopPropagation();
                          chiedi(q);
                        }}
                      >
                        Un altro
                      </button>
                    </div>
                  </Feature>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── continua a guardare ── */}
        <div>
          <Sec sm="episodio 4 di 10">Continua a guardare</Sec>
          <div className="srf wide tap" onClick={() => toast("Aperto l’episodio 5")}>
            <div className="pw">
              <b className="fb2">S</b>
              <Img src={P("1524985069026-dd778a71c7b4")} />
            </div>
            <div className="in">
              <div className="k">
                <span className="dot guarda" />
                stagione 2 · episodio 4 di 10
              </div>
              <div className="t">Succession</div>
              <div className="staterow">
                <span className="prog">
                  <i style={{ width: "40%" }} />
                </span>
                <button
                  className="btn-teal tap"
                  onClick={(e) => {
                    e.stopPropagation();
                    toast("Segnato: episodio 5");
                  }}
                >
                  +1 episodio
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── stasera per te ── */}
        <div>
          <Sec sm="con il perché">Stasera per te</Sec>
          <Feature
            img={GUARDA_FOTO.stasera}
            tone="dark"
            dot="guarda"
            k="film · 2 h 09 · azione"
            t="Spider-Man: Far From Home"
            m="Peter Parker in vacanza in Europa combatte gli Elementali con Mysterio."
            onClick={() => setSheet(TITOLI[1])}
          >
            <div className="why">
              {I.tick({ s: 13 })}ce l’hai su Prime Video, e stasera hai due ore
              <Feedback perche="Te lo propongo perché guardi azione nel fine settimana." />
            </div>
            <div className="row">
              <button
                className="cta tap"
                onClick={(e) => {
                  e.stopPropagation();
                  toast("Aperto Prime Video");
                }}
              >
                Dove vederlo
              </button>
              <button
                className="btn2 tap"
                onClick={(e) => {
                  e.stopPropagation();
                  toast("Segnato come visto");
                }}
              >
                L’ho visto
              </button>
            </div>
          </Feature>
        </div>

        {/* ── la tua lista ── */}
        <div>
          <Sec sm={vis.length + " titoli"}>La tua lista</Sec>
          <div className="chips">
            {["da vedere", "visti", "tutti"].map((f) => (
              <Chip key={f} on={filtro === f} onClick={() => setFiltro(f)}>
                {f}
              </Chip>
            ))}
            <Chip
              on={tipo === "Film"}
              onClick={() => setTipo(tipo === "Film" ? null : "Film")}
            >
              {I.film({ s: 12 })}film
            </Chip>
            <Chip
              on={tipo === "Serie"}
              onClick={() => setTipo(tipo === "Serie" ? null : "Serie")}
            >
              {I.tv({ s: 12 })}serie
            </Chip>
          </div>
          {vis.length ? (
            <div className="g3 stag">
              {vis.map((x, i) => (
                <Poster
                  key={i}
                  img={x.img}
                  t={x.t}
                  badge={x.tipo.toLowerCase()}
                  seen={x.visto}
                  m={x.visto ? "visto · voto " + x.voto : x.dove}
                  onClick={() => setSheet(x)}
                />
              ))}
            </div>
          ) : (
            <Empty
              icon={I.tv({ s: 17 })}
              t="Qui non c’è ancora niente"
              m="cerca un titolo e aggiungilo:<br/>lo ritrovi in questa griglia"
            />
          )}
        </div>

        {/* ── podcast ── */}
        <div>
          <Sec sm="tre che segui">Podcast</Sec>
          <div className="g3 stag">
            {PODCAST.map((p, i) => (
              <Poster
                key={i}
                sq
                img={p.img}
                t={p.t}
                m={p.m}
                badge={p.nuovo ? "nuovo" : undefined}
                onClick={() => toast("Aperto: " + p.t)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── il foglio del titolo ── */}
      {sheet && (
        <Sheet onClose={() => setSheet(null)}>
          <SheetHero img={sheet.img} k={sheet.m} h2={sheet.t} cold />
          <div className="pad">
            <div className="sub">
              {sheet.dove
                ? "Dove ce l’hai: " + sheet.dove
                : "Non è in streaming in Italia."}
            </div>
            <div className="srf" style={{ marginTop: "16px" }}>
              {(
                [
                  [I.play({ s: 16 }), "Dove vederlo", sheet.dove || "solo a noleggio"],
                  [
                    I.tick({ s: 16 }),
                    "visto" in sheet && sheet.visto ? "Non l’ho visto" : "L’ho visto",
                    "visto" in sheet && sheet.visto
                      ? "torna fra i da vedere"
                      : "esce dalla lista e ti chiedo il voto",
                  ],
                  [I.star({ s: 16 }), "Simili a questo", "altri titoli dello stesso genere"],
                ] as const
              ).map(([ic, t, m], i) => (
                <div
                  className="row-act tap"
                  key={i}
                  onClick={() => {
                    setSheet(null);
                    toast(t);
                  }}
                >
                  <span className="ic2">{ic}</span>
                  <span className="in">
                    <span className="t">{t}</span>
                    <span className="m">{m}</span>
                  </span>
                  <span className="chevhit">
                    {I.chev({ c: "chev", st: { transform: "rotate(-90deg)" } })}
                  </span>
                </div>
              ))}
            </div>
            <div className="danger" style={{ margin: "28px 0 8px" }}>
              <button
                className="tap"
                onClick={() => {
                  setSheet(null);
                  toast("Tolto dalla lista");
                }}
              >
                Togli dalla lista
              </button>
            </div>
          </div>
        </Sheet>
      )}
    </div>
  );
}

/* ══════════════ GUSCIO ══════════════
   Le quattro luci d'ambiente, la barra in fondo con il ＋, il toast.
   In quest'ondata l'unica scheda montata è Guarda: le altre tre si accendono
   quando arriva la loro schermata, non prima. */

const TABS = [
  ["home", "Home", I.home],
  ["cucina", "Cucina", I.pot],
  ["allenamento", "Allenamento", I.dumb],
  ["guarda", "Guarda", I.tv],
] as const;

export default function GuardaProva() {
  const [boot, setBoot] = useState(true);
  const [msg, setMsg] = useState("");
  const [asks, setAsks] = useState(0);
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tab = "guarda";

  useEffect(() => {
    const t = setTimeout(() => setBoot(false), 750);
    return () => clearTimeout(t);
  }, []);

  const toast = useCallback((t: string) => {
    setMsg(t);
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setMsg(""), 2200);
  }, []);

  /* le luci scorrono più piano della pagina */
  useEffect(() => {
    const h = () => {
      const y = window.scrollY;
      const l = document.querySelector<HTMLElement>(".lights");
      if (l) l.style.transform = "translateY(" + -y * 0.12 + "px)";
    };
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <div className="k2">
      {boot && (
        <div className="boot">
          <span className="orca">{I.orca(46)}</span>
        </div>
      )}

      <div className="lights">
        <i className="l1" />
        <i className="l2" />
        <i className="l3" />
        <i className="l4" />
      </div>

      <div>
        <Guarda toast={toast} asks={asks} setAsks={setAsks} />
      </div>

      <div className={"toast" + (msg ? " on" : "")}>{msg}</div>

      <div className="tab">
        {TABS.slice(0, 2).map(([k, l, ic]) => (
          <div key={k} className={"ti tap" + (tab === k ? " on" : "")}>
            {ic({ s: 20 })}
            {l}
          </div>
        ))}
        <div
          className="fab tap"
          onClick={() => toast("Cattura: foto, screenshot o due righe")}
        >
          {I.plus({ s: 22 })}
        </div>
        {TABS.slice(2).map(([k, l, ic]) => (
          <div key={k} className={"ti tap" + (tab === k ? " on" : "")}>
            {ic({ s: 20 })}
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}
