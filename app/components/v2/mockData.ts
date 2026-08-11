/* ═════════ DATI FINTI · copiati da docs/mockups/keiko-v2-mock.html ═════════
   Servono alla rotta di parità /v2/keiko e a nient'altro. Nessuna riga qui
   viene dal database: quando la sezione riceve i dati veri, questo file smette
   di essere importato da quella sezione.

   Ondata 1 → solo Guarda. Le altre sezioni portano i loro dati nella loro
   ondata: qui non si anticipa niente. */

/** la fabbrica di locandine del mock: sempre 400×600 */
export const P = (id: string) =>
  "https://images.unsplash.com/photo-" + id + "?w=400&h=600&q=70&auto=format&fit=crop";

export type Titolo = {
  t: string;
  m: string;
  tipo: "Film" | "Serie";
  dove: string;
  img: string;
  visto?: boolean;
  voto?: number;
};

export const TITOLI: Titolo[] = [
  { t: "Déjà Vu", m: "2006 · film", tipo: "Film", dove: "Prime Video", img: P("1489599849927-2ee91cede3ba") },
  { t: "The Prestige", m: "2006 · film", tipo: "Film", dove: "Netflix", img: P("1440404653325-ab127d49abc1") },
  { t: "Spider-Man: Homecoming", m: "2017 · film", tipo: "Film", dove: "Now", img: P("1478720568477-152d9b164e26") },
  { t: "Una famiglia quasi normale", m: "2023 · serie", tipo: "Serie", dove: "Netflix", img: P("1517604931442-7e0c8ed2963c") },
  { t: "Bloodline", m: "2015 · serie", tipo: "Serie", dove: "Netflix", img: P("1512427691650-15f4d7d0e8e1") },
  { t: "Dune", m: "2021 · film", tipo: "Film", dove: "Now", img: P("1534447677768-be436bb09401") },
  { t: "Boris", m: "2007 · serie", tipo: "Serie", dove: "Disney+", img: P("1485846234645-a62644f84728"), visto: true, voto: 4 },
  { t: "Succession", m: "2018 · serie", tipo: "Serie", dove: "Now", img: P("1524985069026-dd778a71c7b4"), visto: true, voto: 5 },
];

export type Podcast = { t: string; m: string; nuovo?: boolean; img: string };

export const PODCAST: Podcast[] = [
  {
    t: "Il Mondo",
    m: "Internazionale · ogni giorno",
    nuovo: true,
    img: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&h=400&q=70&auto=format&fit=crop",
  },
  {
    t: "Morgana",
    m: "Chora · ogni settimana",
    img: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400&h=400&q=70&auto=format&fit=crop",
  },
  {
    t: "Muschio Selvaggio",
    m: "ogni settimana",
    img: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&q=70&auto=format&fit=crop",
  },
];

/** `ce` = ce l'hai già in un abbonamento tuo */
export type Risultato = { t: string; m: string; dove: string; ce: boolean; img: string };

export const CERCA: Risultato[] = [
  { t: "Matrix", m: "1999 · film", dove: "Netflix, Now, TIMVision", ce: true, img: P("1493711662062-fa541adb3fc8") },
  { t: "Matrix Revolutions", m: "2003 · film", dove: "Netflix, Now, TIMVision", ce: true, img: P("1478720568477-152d9b164e26") },
  { t: "Matrix Reloaded", m: "2003 · film", dove: "Netflix, Prime Video, Now", ce: true, img: P("1440404653325-ab127d49abc1") },
  { t: "Matrix Resurrections", m: "2021 · film", dove: "Netflix, TIMVision", ce: true, img: P("1534447677768-be436bb09401") },
  { t: "Matrix — la creazione di un mito", m: "2001 · documentario", dove: "solo a noleggio", ce: false, img: P("1512427691650-15f4d7d0e8e1") },
  { t: "Codice Matrix", m: "2003 · serie", dove: "non in streaming in Italia", ce: false, img: P("1517604931442-7e0c8ed2963c") },
];

/** le due foto grandi della schermata Guarda (non sono locandine: sono 800px) */
export const GUARDA_FOTO = {
  consiglio:
    "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=70&auto=format&fit=crop",
  stasera:
    "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&q=70&auto=format&fit=crop",
};
