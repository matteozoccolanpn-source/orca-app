# Chiavi API — per accendere le foto/dati "seri"

> Il codice è già pronto e a prova di errore: senza chiave resta il gradiente,
> niente si rompe. Ogni chiave che aggiungi "accende" una fonte.
> Le chiavi vanno messe in DUE posti: `.env.local` (sul tuo Mac) e su **Vercel**
> (Settings → Environment Variables). Poi serve un nuovo deploy.

## Riepilogo veloce
| Fonte | A cosa serve | Variabili | Chiave? |
|---|---|---|---|
| TMDB | copertine film/serie | `TMDB_API_KEY` | ✅ già fatta |
| Spotify | foto artisti (concerti) | `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` | da prendere |
| Google Places | foto luoghi reali (ristoranti/hotel/musei/città) | `GOOGLE_PLACES_API_KEY` | da prendere (serve fatturazione Google, gratis fino a soglia) |
| Spoonacular | foto piatti (dieta) | `SPOONACULAR_KEY` | da prendere |
| TheSportsDB | stemmi/foto sport | `THESPORTSDB_KEY` | opzionale (funziona con chiave di test "3") |
| Open-Meteo | meteo sugli eventi | — | ❌ nessuna chiave |
| wger | immagini esercizi | — | ❌ nessuna chiave |

## Come prendere ogni chiave

### 1. Spotify (foto artisti) — consigliata, facile
1. Vai su **developer.spotify.com** → Dashboard → accedi.
2. **Create app** (nome: Keiko, redirect URI qualsiasi, es. `http://localhost`).
3. Nell'app trovi **Client ID** e **Client Secret**.
4. Metti in env: `SPOTIFY_CLIENT_ID=...` e `SPOTIFY_CLIENT_SECRET=...`.

### 2. Spoonacular (foto piatti)
1. **spoonacular.com/food-api** → registrati (piano gratuito).
2. Copia la **API Key** dal profilo.
3. Env: `SPOONACULAR_KEY=...`.

### 3. Google Places (foto luoghi) — la migliore, ma richiede setup
1. **console.cloud.google.com** → crea un progetto.
2. Abilita **Places API** (API & Services → Library).
3. Attiva la **fatturazione** (serve una carta, ma c'è un ampio uso gratuito mensile).
4. Crea una **API Key** (Credentials) → **limitala** a Places API.
5. Env: `GOOGLE_PLACES_API_KEY=...`.
   (La chiave resta server-side: le foto passano dal nostro proxy /api/place-photo.)

### 4. TheSportsDB (sport) — opzionale
Funziona già con la chiave di test pubblica "3". Per risultati migliori prendi una
chiave dal loro sito e metti `THESPORTSDB_KEY=...`.

### 5. Open-Meteo (meteo) e wger (esercizi)
Nessuna chiave. Funzionano appena fai il deploy.

## Dove metterle
- **Sul Mac**: file `.env.local` nella cartella del progetto, una riga per variabile.
- **Su Vercel**: progetto orca-app → Settings → Environment Variables → aggiungi
  ognuna → Save. Poi fai un nuovo deploy (basta un push).

## Onestà sui risultati
- **Ottimi/costanti**: TMDB (film), Spotify (artisti), Google Places (luoghi), meteo.
- **A tratti** (nomi in italiano vs database inglesi): Spoonacular (piatti), wger
  (esercizi), TheSportsDB. Dove non trovano, resta il gradiente pulito (mai brutto).
