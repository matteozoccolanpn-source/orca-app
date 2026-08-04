import { getWatchlist, setWatchItemTmdb } from "@/lib/supabase";
import { requireLogin } from "@/lib/require-login";
import { resolveTitle, posterById, primaryGenreById, type TmdbType } from "@/lib/tmdb";
import GuardaView from "./GuardaView";

// Sempre dati freschi (come la home): la lista cambia a ogni aggiunta.
export const dynamic = "force-dynamic";

export default async function GuardaPage() {
  await requireLogin();
  const righe = await getWatchlist();

  // Locandina e genere ora stanno in tabella: si chiede a TMDB SOLO per le righe
  // che non ce li hanno ancora, cioè i titoli aggiunti prima di questa modifica.
  // Quello che si ottiene viene riscritto in tabella, così la volta dopo la
  // pagina non chiama più niente. Prima erano due chiamate per titolo a ogni
  // apertura, per sempre.
  const daSalvare: { id: string; dati: Parameters<typeof setWatchItemTmdb>[1] }[] = [];

  const items = await Promise.all(
    righe.map(async (r) => {
      if (r.poster && r.genre) return r;                    // già a posto: zero chiamate

      // Titolo vecchio, senza id TMDB: lo si risolve UNA volta e si salva tutto.
      if (!r.tmdbId || !r.tmdbType) {
        const ris = await resolveTitle(r.title, r.kind);
        if (!ris) return r;                                  // TMDB non lo conosce: resta il gradiente
        daSalvare.push({
          id: r.id,
          dati: { tmdbId: ris.tmdbId, tmdbType: ris.tmdbType, poster: ris.poster, genre: ris.genre, year: ris.year },
        });
        return {
          ...r,
          poster: r.poster ?? ris.poster,
          genre: r.genre ?? ris.genre,
          tmdbId: ris.tmdbId,
          tmdbType: ris.tmdbType,
          year: r.year ?? ris.year,
        };
      }

      // Ha l'id ma manca la locandina o il genere: si chiede solo quello che manca.
      const tipo: TmdbType = r.tmdbType === "tv" ? "tv" : "movie";
      const [poster, genre] = await Promise.all([
        r.poster ? Promise.resolve(r.poster) : posterById(r.tmdbId, tipo),
        r.genre ? Promise.resolve(r.genre) : primaryGenreById(r.tmdbId, tipo),
      ]);
      if (poster !== r.poster || genre !== r.genre) daSalvare.push({ id: r.id, dati: { poster, genre } });
      return { ...r, poster, genre };
    })
  );

  // Il recupero si scrive subito, in parallelo. Non si usa `after()` (che
  // scriverebbe dopo aver risposto) perché lì dentro Next non lascia più leggere
  // i cookie, e senza quelli il database non sa di chi è la riga: la scrittura
  // fallirebbe in silenzio e i titoli vecchi resterebbero da risolvere per
  // sempre. Costa un attimo alla PRIMA apertura, e solo per i titoli vecchi.
  if (daSalvare.length) {
    await Promise.all(daSalvare.map((s) => setWatchItemTmdb(s.id, s.dati)));
  }

  return <GuardaView items={items} />;
}
