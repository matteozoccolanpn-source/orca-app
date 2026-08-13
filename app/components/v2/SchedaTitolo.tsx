"use client";

import type { ComponentType, CSSProperties } from "react";
import { I } from "./icons";
import type { DettaglioTitolo, TitoloSimile } from "./watch-rotte";

/* ═════════ LA SCHEDA DI UN TITOLO ═════════
 *
 * Il corpo del pannello di un film o di una serie: trama, anno e genere, le
 * azioni, le piattaforme, i titoli simili. Lo montano la Home, la Guarda e i
 * consigli — tre schermate che prima avrebbero avuto tre copie quasi uguali.
 *
 * ⚠️ QUI DENTRO NON C'È NESSUNA CHIAMATA DI RETE. I dati arrivano già pronti
 * da chi lo monta, insieme al loro stato («fermo / chiedo / risposto»): è chi
 * monta a sapere quando chiedere e dove tenere lo stato. Le regole delle
 * chiamate — gli indirizzi, i parametri, la forma della risposta — stanno in
 * `watch-rotte.ts`, così le tre schermate non se le riscrivono a modo loro.
 *
 * Questo file è nato SPOSTANDO il pannello della Home, senza aggiungere
 * niente: quello che c'era fa quello che faceva.
 */

type Stato = "fermo" | "chiedo" | "risposto";

export function SchedaTitolo({
  id, season, episode,
  dettaglio, simili, piattaforme,
  avanzo,
  onAvanza, onDove, onSimile,
  Foto,
}: {
  /** A che punto sei della serie. Se ci sono tutti e tre, l'hai cominciata. */
  id?: string | null; season?: number | null; episode?: number | null;
  dettaglio: { stato: Stato; d: DettaglioTitolo | null };
  simili: { stato: Stato; lista: TitoloSimile[] };
  piattaforme: { stato: Stato; lista: string[] };
  avanzo: boolean;
  onAvanza: (id: string) => void;
  onDove: () => void;
  /** Toccare un titolo simile: chi monta decide dove porta. */
  onSimile: (titolo: string) => void;
  /** La foto di una card, con il ripiego di categoria. La passa chi monta:
   *  è l'unico modo perché la Home resti identica al pixel. */
  Foto: ComponentType<{ src?: string | null; cat?: "film"; style?: CSSProperties }>;
}) {
  /* CHI È LA PRIMARIA, e lo decide il DATO.
     Se `season` ed `episode` ci sono, la serie l'hai cominciata e la domanda
     del momento è «a che punto sono»: primaria «+1 episodio». Se non ci sono
     — serie mai aperta, o un film — la domanda è «come lo guardo»: primaria
     «Dove vederlo». Nessuna ipotesi: è la regola 3-quinquies risolta dal dato. */
  const iniziata = !!id && season != null && episode != null;

  return (
    <>
      {dettaglio.stato === "chiedo" && (
        <div style={{ marginTop: 14 }}>
          <span className="sk sk-line" style={{ display: "block", width: "40%" }} />
          <span className="sk sk-line" style={{ display: "block", width: "94%" }} />
          <span className="sk sk-line" style={{ display: "block", width: "72%" }} />
        </div>
      )}
      {dettaglio.stato === "risposto" && dettaglio.d && (
        <div style={{ marginTop: 14 }}>
          {[dettaglio.d.year, dettaglio.d.genres?.slice(0, 2).join(" · ")].filter(Boolean).length > 0 && (
            <div className="status" style={{ marginTop: 0 }}>
              {[dettaglio.d.year, dettaglio.d.genres?.slice(0, 2).join(" · ")].filter(Boolean).join(" · ")}
            </div>
          )}
          {dettaglio.d.overview && (
            <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--txt2)", margin: "8px 0 0" }}>
              {dettaglio.d.overview}
            </p>
          )}
        </div>
      )}

      {iniziata && (
        <button
          className="cta wide tap"
          style={{ marginTop: 14 }}
          onClick={() => onAvanza(id!)}
          disabled={avanzo}
        >
          {avanzo ? "Segno…" : <>{I.tick({ s: 15 })}+1 episodio</>}
        </button>
      )}
      <div className="status" style={{ marginTop: iniziata ? 10 : 0 }}>
        {iniziata ? `Sei a S${season}E${episode}` : ""}
      </div>
      <button
        className={(iniziata ? "btn2" : "cta") + " wide tap"}
        style={{ marginTop: iniziata ? 4 : 14 }}
        onClick={onDove}
        disabled={piattaforme.stato === "chiedo"}
      >
        {piattaforme.stato === "chiedo" ? "Cerco…" : <>{I.play({ s: 15 })}Dove vederlo</>}
      </button>
      {piattaforme.stato === "risposto" && (
        piattaforme.lista.length > 0 ? (
          <div className="srf" style={{ marginTop: 10 }}>
            {piattaforme.lista.map((n) => (
              <div className="row-act" key={n} style={{ cursor: "default" }}>
                <span className="ic2">{I.tv({ s: 16 })}</span>
                <span className="in"><span className="t">{n}</span></span>
              </div>
            ))}
          </div>
        ) : (
          <p className="status">Non risulta in streaming in Italia in questo momento.</p>
        )
      )}

      {simili.stato === "risposto" && simili.lista.length > 0 && (
        <>
          <div className="status" style={{ marginTop: 18, marginBottom: 8 }}>Se ti è piaciuto</div>
          <div className="shelf">
            {simili.lista.slice(0, 8).map((s) => (
              <div
                className="rcard srf tap"
                key={s.title}
                onClick={() => onSimile(s.title)}
                role="button"
              >
                <Foto src={s.poster} cat="film" style={{ width: 74, flex: "none", alignSelf: "stretch" }} />
                <div className="in"><div className="t">{s.title}</div></div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export default SchedaTitolo;
