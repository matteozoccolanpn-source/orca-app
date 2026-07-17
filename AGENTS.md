<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:keiko-redesign-rules -->
# Redesign Keiko (branch `redesign`) — regole vincolanti

**Fonte di verità visiva**: `docs/mockups/keiko-final.html`. Le misure e i colori NON si
interpretano: si copiano (metodo port 1:1 — stesso CSS, stesse classi, stessa struttura DOM).
Se un valore visivo non esiste nel mockup, chiedilo a Matteo: non inventarlo.

Prima di toccare la UI, leggi:
- `docs/UI-REGOLE-BASE.md` — separazione card/fondo (trio fill+bordo+ombra, 3 strati delle art,
  test scala di grigi), un accento per card, ordine di lettura.
- `docs/UI-VOICE.md` — ogni testo visibile si copia da qui, non si inventa.
- `docs/UI-MAPPA-HOME.md` — cosa apre ogni tasto.
- Logo: `docs/logo/keiko-logo.svg` (inline, currentColor) · icona PWA: `docs/logo/keiko-icon.svg`.

Vincoli di sempre: non toccare `lib/` e `app/api/` (solo presentazione); build verde prima di
ogni commit; MAI committare senza ok esplicito di Matteo; la home vecchia resta funzionante
(v2 dietro interruttore); accent = var(--accent), il viola non esiste.

Auto-verifica: dopo ogni sezione, screenshot dell'app (localhost:3000/?v2) accanto al mockup
alla stessa larghezza + versione in scala di grigi: ogni card deve staccare dal fondo.
<!-- END:keiko-redesign-rules -->
