# Keiko — Scheda decisioni COMPLETA (scegli A/B/C)

> Apri in Cursor e scrivi la tua scelta dopo la freccia `→`. Poi rincolla tutto in chat.
> **Urgenza:** 🔴 3 = ora · 🟡 2 = presto · 🟢 1 = può aspettare (è la mia stima, puoi cambiarla scrivendola dopo `urg:`).
> ⭐ = mia raccomandazione. Per le voci "idea": **A)** ci tengo / **B)** forse, backlog / **C)** no.
> Formato risposta: `→ A` (o `B`, `C`, `salta`), e se vuoi `urg: 3`.
>
> Già fatti: movimenti v1 · pallino Vercel.

---

## PARTE 1 — BUG & STABILITÀ

**1. Tema che si ribalta in chiaro** — 🔴3
A) ⭐ Scuro fisso (tolgo il chiaro) · B) Toggle salvato server (cookie) · C) lascia così
→ 

**2. Logout assente nella v2** — 🔴3
A) ⭐ Icona in topbar · B) Menu Profilo/Impostazioni nuovo · C) in fondo alla Home
→ 

**3. Cache PWA mostra versione vecchia** — 🟡2
A) ⭐ Versioning + banner "ricarica" · B) hard-refresh a mano
→ 

**4. Spunte allenamento non si salvano** — 🟡2
A) ⭐ Salvo ogni spunta subito · B) Salvo a fine sessione
→ 

**5. "Sposta"/riprogramma evento buggato** — 🟡2
A) Fix tampone fuso orario · B) ⭐ Gestione date centralizzata
→ 

**6. Ricerca AI (todo/film/eventi) non arricchisce** — 🔴3
A) Abbasso soglia (arricchisci sempre) · B) Miglioro prompt · C) ⭐ Entrambi
→ 

**7. Ricerca "Cerca in Keiko" finta** — 🟢1
A) ⭐ La nascondo finché non c'è · B) La implemento subito
→ 

**8. Chip/link morti ("Biglietto", "· presto")** — 🟢1
A) ⭐ Li nascondo tutti ora · B) Li collego uno a uno
→ 

**9. Copertine film finte** — 🟡2
A) ⭐ Locandine reali (TMDB) · B) Tolgo immagini, card testuali
→ 

**10. Dati evento mock in KeikoPreview** — 🟢1
A) ⭐ Li rimuovo · B) Li lascio come fallback
→ 

## PARTE 2 — FONDAMENTA

**11. Design system doppio (globals.css + keiko.css)** — 🟡2
A) ⭐ Unifico in un set unico · B) Lo tengo doppio, caso per caso
→ 

**12. Font brand (ora Inter)** — 🟢1
A) ⭐ Passo a un rounded · B) Resto Inter · C) Proponimene 2-3
→ 

**13. Modello navigazione** — 🟡2
A) ⭐ Bottom tab bar (Home/Viaggi/Salute/Guarda) · B) Resta swipe · C) entrambi
→ 

**14. Card Home: apertura** — 🟡2
A) ⭐ Popover contestuale vicino al tap · B) Bottom-sheet dal basso · C) resta pagina
→ 

**15. Pipeline AI unica (todo+film+eventi)** — 🟡2
A) ⭐ Un servizio unico condiviso · B) Ognuno per conto suo
→ 

**16. Campo immagine negli schemi (pasti/esercizi/film/tappe)** — 🟡2
A) ⭐ Lo aggiungo (abilita foto reali) · B) Dopo
→ 

## PARTE 3 — ESTETICA per scheda

### Home
**17. Art gradient uguali e cupe** — 🟢1 · A) ⭐ Più contrasto/identità per categoria · B) Foto reali · C) salta
→ 
**18. Font non brand** — 🟢1 · A) ⭐ Allineo al font scelto · B) salta
→ 
**19. Glyph emoji piccolo** — 🟢1 · A) ⭐ Ingrandisco · B) Icone custom · C) salta
→ 
**20. Week strip "oggi" stacca poco** — 🟢1 · A) ⭐ Pallino evento + più respiro · B) salta
→ 
**21. Kicker piatto (saluto/meteo)** — 🟡2 · A) ⭐ Gerarchia (saluto grande + meteo chip) · B) salta
→ 
**22. Mini card info tagliata** — 🟢1 · A) ⭐ Rivedo formato/altezza · B) salta
→ 
**23. Dots indicatori invisibili** — 🟢1 · A) ⭐ Ingrandisco/contrasto · B) salta
→ 
**24. Ombre troppo marcate** — 🟢1 · A) ⭐ Alleggerisco · B) salta
→ 
**25. Spaziatura sezioni incoerente** — 🟢1 · A) ⭐ Ritmo verticale unico · B) salta
→ 
**26. Topbar affollata** — 🟢1 · A) ⭐ Raggruppo azioni in menu · B) salta
→ 

### Dieta (rethink: base Keiko + ispirazione CREME / Kitchen Stories)
**27. Riga categorie/stories circolari (CREME)** — 🟡2 · A) ⭐ Sì · B) salta
→ 
**28. Dettaglio pasto con foto reale + azioni** — 🟡2 · A) ⭐ Sì (Cuoci/Pianifica/Scambia/Chiedi) · B) versione light · C) salta
→ 
**29. Cook mode passo-passo con timer inline** — 🟡2 · A) ⭐ Sì · B) backlog · C) no
→ 
**30. Editorialità Kitchen Stories (card+tag+tempo)** — 🟢1 · A) ⭐ Sì · B) salta
→ 
**31. Hero dieta cupa** — 🟢1 · A) ⭐ Più fresca/chiara · B) foto reale · C) salta
→ 
**32. Righe pasto uniformi** — 🟢1 · A) ⭐ Differenzio colazione/pranzo/cena · B) salta
→ 
**33. "Giornata libera" spoglia** — 🟢1 · A) ⭐ Illustrazione · B) salta
→ 
**34. Bottone "Scambia" che fa solo toast** — 🟡2 · A) ⭐ Lo rendo reale · B) lo tolgo · C) salta
→ 
**35. Carosello "Prossimi giorni" illeggibile** — 🟢1 · A) ⭐ Card sintetiche · B) salta
→ 
**36. Indicatore completamento giornata pasti** — 🟢1 · A) ⭐ Aggiungo (x/n) · B) salta
→ 

### Allenamento (metodo/semplicità: Equinox+ / Tonal + foto)
**37. Header motivazionale + barra obiettivo (Equinox)** — 🟡2 · A) ⭐ Sì · B) salta
→ 
**38. Sessione oggi come card con immagine + "Inizia"** — 🟡2 · A) ⭐ Sì · B) salta
→ 
**39. Visual progresso/benchmark (Tonal Strength Score)** — 🟡2 · A) ⭐ Sì (streak→grafico) · B) backlog · C) no
→ 
**40. Ring completamento valorizzato** — 🟢1 · A) ⭐ Più grande/animato · B) salta
→ 
**41. Badge streak poco visibile** — 🟢1 · A) ⭐ Lo evidenzio · B) salta
→ 
**42. Righe esercizio piatte (manca serie×reps)** — 🟢1 · A) ⭐ Aggiungo metadati · B) salta
→ 
**43. "Oggi riposo" spoglio** — 🟢1 · A) ⭐ Illustrazione + suggerimento · B) salta
→ 
**44. Carosello settimana stili simili** — 🟢1 · A) ⭐ Codifica colori · B) salta
→ 
**45. "Riprogramma" fa solo toast** — 🟢1 · A) ⭐ Collego o tolgo · B) salta
→ 
**46. Spunta esercizio feedback debole** — 🟢1 · A) ⭐ Check colorato pieno · B) salta
→ 

### Viaggio (ispirazione Stippl + foto)
**47. Tab "Destinazioni / Giorno per giorno" (Stippl)** — 🟡2 · A) ⭐ Sì · B) salta
→ 
**48. Mappa con pin e rotta** — 🟡2 · A) ⭐ Sì · B) mappa statica · C) no
→ 
**49. Anello "notti pianificate" + tempi trasporto** — 🟢1 · A) ⭐ Sì · B) salta
→ 
**50. Budget di viaggio** — 🟢1 · A) ⭐ Sì · B) backlog · C) no
→ 
**51. Checklist/packing list** — 🟢1 · A) ⭐ Sì · B) backlog · C) no
→ 
**52. Hero destinazione con foto reale** — 🟡2 · A) ⭐ Sì · B) salta
→ 
**53. Empty state viaggio spoglio** — 🟢1 · A) ⭐ Illustrazione + CTA · B) salta
→ 
**54. Slot itinerario anonimi** — 🟢1 · A) ⭐ Icona per tipo tappa · B) salta
→ 
**55. Riassunto tagliato a 2 righe** — 🟢1 · A) ⭐ Espandibile · B) salta
→ 
**56. Separatori per data nell'itinerario** — 🟢1 · A) ⭐ Sì · B) salta
→ 

### Guarda
**57. Locandine reali (già in bug 9)** — 🟡2 · A) ⭐ TMDB · B) card testuali · C) salta
→ 
**58. Hero "Stasera per te" cinematografico** — 🟢1 · A) ⭐ Poster + sfondo sfocato · B) salta
→ 
**59. Card add/consiglio mescolate ai film** — 🟢1 · A) ⭐ Barra azioni separata · B) salta
→ 
**60. `prompt()` del browser (brutto)** — 🟡2 · A) ⭐ Campo in-app · B) salta
→ 
**61. seenMark ✅ poco elegante** — 🟢1 · A) ⭐ Grigio/dissolvenza sul poster · B) salta
→ 
**62. Badge Film/Serie** — 🟢1 · A) ⭐ Aggiungo · B) salta
→ 
**63. Micro-metadati (anno/durata/rating)** — 🟢1 · A) ⭐ Aggiungo · B) salta
→ 
**64. Logo piattaforma su "Dove vederlo"** — 🟢1 · A) ⭐ Sì · B) salta
→ 
**65. Griglia titoli clamp 3 righe** — 🟢1 · A) ⭐ Rivedo con poster · B) salta
→ 
**66. "notifiche uscite · presto"** — 🟢1 · A) ⭐ Tolgo · B) implemento · C) salta
→ 

### Add
**67. Tab Foto/Testo piccoli** — 🟢1 · A) ⭐ Più grandi · B) salta
→ 
**68. Drop-zone anonima** — 🟢1 · A) ⭐ Icona + microcopy caldo · B) salta
→ 
**69. Esempi cliccabili nel testo libero** — 🟢1 · A) ⭐ Sì · B) salta
→ 
**70. Spinner generici** — 🟢1 · A) ⭐ Skeleton brand · B) salta
→ 
**71. EventForm grigio** — 🟢1 · A) ⭐ Stile card come le altre schede · B) salta
→ 
**72. Success auto-redirect 2,5s** — 🟢1 · A) ⭐ Aggiungo "annulla/aggiungi altro" · B) salta
→ 
**73. Preview live evento mentre scrivi** — 🟢1 · A) ⭐ Sì · B) backlog · C) no
→ 
**74. FAB "+" mancante in Home v2** — 🟡2 · A) ⭐ Lo aggiungo · B) salta
→ 

### Login
**75. Login spoglio (illustrazione balena)** — 🟢1 · A) ⭐ Sì · B) salta
→ 
**76. Claim generico** — 🟢1 · A) ⭐ Racconto valore (screenshot→evento) · B) salta
→ 
**77. Bollicine per continuità** — 🟢1 · A) ⭐ Sì · B) salta
→ 
**78. Stato caricamento dopo "Accedi"** — 🟢1 · A) ⭐ Sì · B) salta
→ 

## PARTE 4 — MIGLIORIE COMPLESSIVE

**79. Skeleton loading ovunque** — 🟢1 · A) ⭐ Sì · B) salta
→ 
**80. Feedback tattile (haptics)** — 🟢1 · A) ⭐ Sì · B) salta
→ 
**81. Undo universale (elimina evento/dieta/scheda)** — 🟢1 · A) ⭐ Sì · B) salta
→ 
**82. Pull-to-refresh sulle liste** — 🟢1 · A) ⭐ Sì · B) salta
→ 
**83. Empty state standardizzati (illustr.+CTA)** — 🟢1 · A) ⭐ Sì · B) salta
→ 
**84. Notifiche push reali (VAPID già pronto)** — 🟡2 · A) ⭐ Sì · B) backlog · C) no
→ 
**85. Onboarding prima apertura** — 🟢1 · A) ⭐ Sì · B) backlog · C) no
→ 
**86. Componente Card unico** — 🟡2 · A) ⭐ Sì (dipende da 11) · B) salta
→ 
**87. Palette categorie coerente tra schede** — 🟢1 · A) ⭐ Sì · B) salta
→ 
**88. Icone custom per tipo evento** — 🟢1 · A) ⭐ Sì · B) resto emoji · C) salta
→ 
**89. Accessibilità (focus/contrasti/aria)** — 🟢1 · A) ⭐ Sì · B) salta
→ 
**90. Tutte le azioni "· presto": funzionano o spariscono** — 🟢1 · A) ⭐ Spariscono ora · B) le implemento
→ 
**91. Ricerca globale vera** — 🟢1 · A) ⭐ Sì (dopo) · B) backlog · C) no
→ 
**92. Gestione errori uniforme con retry** — 🟢1 · A) ⭐ Sì · B) salta
→ 
**93. Persistenza granulare (ogni micro-stato)** — 🟡2 · A) ⭐ Sì · B) salta
→ 
**94. Timezone in un'unica utility** — 🟡2 · A) ⭐ Sì (lega al bug 5) · B) salta
→ 
**95. Settings/Profilo (logout+tema+notifiche+dati)** — 🟡2 · A) ⭐ Sì · B) salta
→ 
**96. Tono di voce coerente (UI-VOICE.md)** — 🟢1 · A) ⭐ Sì · B) salta
→ 
**97. Gesture uniformi (stessa soglia/feedback)** — 🟢1 · A) ⭐ Sì · B) salta
→ 
**98. Modalità offline leggibile** — 🟢1 · A) ⭐ Sì · B) backlog · C) no
→ 
**99. Performance: controllo re-render** — 🟢1 · A) ⭐ Sì · B) salta
→ 
**100. Deep-link a schede/eventi** — 🟢1 · A) ⭐ Sì (per notifiche/widget) · B) backlog · C) no
→ 
**101. Test minimi sui punti fragili** — 🟡2 · A) ⭐ Sì · B) salta
→ 
**102. Telemetria minima d'uso** — 🟢1 · A) ⭐ Sì · B) no
→ 
**103. Riordina/nascondi sezioni Home** — 🟢1 · A) ci tengo · B) backlog · C) ⭐ no per ora
→ 
**104. Backup/export dati** — 🟢1 · A) ci tengo · B) ⭐ backlog · C) no
→ 
**105. Conferma "copiato ✓" sul messaggio viaggio** — 🟢1 · A) ⭐ Sì · B) salta
→ 
**106. Contrasto/leggibilità testo su art scure** — 🟢1 · A) ⭐ Sì · B) salta
→ 
**107. Coerenza raggi/bordi tra schede** — 🟢1 · A) ⭐ Sì · B) salta
→ 
**108. Animazioni di stato coerenti (ok/errore)** — 🟢1 · A) ⭐ Sì · B) salta
→ 

## PARTE 5 — IDEE / FEATURE NUOVE  (A=ci tengo · B=backlog · C=no)

**109. Barra "Dimmi tutto" sempre in Home** — 🟡2 · → 
**110. Input vocale ("Hey Keiko…")** — 🟢1 · → 
**111. AI proattiva (check-in/meteo/come arrivare)** — 🟢1 · → 
**112. AI estrae eventi da email inoltrate** — 🟢1 · → 
**113. AI legge PDF biglietto → evento + tappa** — 🟢1 · → 
**114. Riepilogo giornaliero generato** — 🟢1 · → 
**115. Chat con Keiko (modifica in linguaggio naturale)** — 🟢1 · → 
**116. Podcast preferiti (sezione + puntate + link)** — 🟡2 · → 
**117. Notifica nuova puntata podcast** — 🟢1 · → 
**118. Consiglio podcast per durata tragitto** — 🟢1 · → 
**119. Playlist "per il viaggio"** — 🟢1 · → 
**120. Itinerario giorno-per-giorno (Stippl)** — 🟡2 · → 
**121. Mappa tappe con pin (Stippl)** — 🟡2 · → 
**122. Tracker posti visitati / bucket list** — 🟢1 · → 
**123. Packing list intelligente** — 🟢1 · → 
**124. Budget viaggio per categoria** — 🟢1 · → 
**125. Itinerario condivisibile** — 🟢1 · → 
**126. Meteo destinazione nell'itinerario** — 🟢1 · → 
**127. Documenti di viaggio raccolti** — 🟢1 · → 
**128. Sync Google Calendar** — 🟡2 · → 
**129. Widget iOS prossimo evento** — 🟢1 · → 
**130. Promemoria smart con traffico** — 🟢1 · → 
**131. Eventi ricorrenti** — 🟢1 · → 
**132. Tag/categorie personalizzati** — 🟢1 · → 
**133. Vista settimanale/mensile vera** — 🟢1 · → 
**134. Conto alla rovescia eventi** — 🟢1 · → 
**135. Condivisione evento via link/WhatsApp** — 🟢1 · → 
**136. Grafici progressi allenamento** — 🟢1 · → 
**137. Obiettivi settimanali** — 🟢1 · → 
**138. Integrazione Apple Health/passi** — 🟢1 · → 
**139. Promemoria idratazione/pasti** — 🟢1 · → 
**140. Foto prima/dopo (motivazione)** — 🟢1 · → 
**141. Watchlist con filtri** — 🟢1 · → 
**142. "Cosa vedo stasera?" per tempo disponibile** — 🟢1 · → 
**143. Notifica titolo arrivato su una piattaforma** — 🟢1 · → 
**144. Import watchlist (Letterboxd/IMDb)** — 🟢1 · → 
**145. AI film: trailer + "simile a…"** — 🟢1 · → 
**146. Temi/skin selezionabili (dopo tema fisso)** — 🟢1 · → 
**147. Personalizzazione ordine Home** — 🟢1 · → 
**148. Trailer/anteprima ricette (video)** — 🟢1 · → 
**149. Scansione scontrino spesa → dieta** — 🟢1 · → 
**150. Integrazione mappe per "come arrivare" evento** — 🟢1 · → 

## PARTE 6 — AGGIUNTE (nuovi spunti)

### Icona utente / Profilo Keiko
**151. Icona utente in topbar (apre Profilo)** — 🟡2 · A) ⭐ Sì · B) salta
→ 
**152. Nome utente al login (per personalizzare saluti/frasi)** — 🟡2 · A) ⭐ Sì · B) salta
→ 
**153. Preferenza layout chiaro/scuro nel Profilo** — 🟢1 · A) ⭐ Sì (nota: se scegli "scuro fisso" al punto 1, questa è la sede del toggle) · B) salta
→ 
**154. Notifiche: frequenza di default per tipo evento (nel Profilo)** — 🟡2 · A) ⭐ Sì · B) salta
→ 
**155. Profilo "personalità": duro ↔ chill, per area (notifiche/toni su dieta, allenamento, eventi…)** — 🟡2 · A) ⭐ Sì · B) backlog · C) no
→ 
**156. (Visione) Profilo = motore di personalizzazione unica: gli input dell'utente alimentano preferenze che si adattano nel tempo; trigger su pattern (età, abitudini, "spesso serate uguali", "allenamento presto"…). Architettura da pensare da subito.** — 🟡2 · A) ⭐ Sì, la teniamo come stella polare · B) backlog · C) no
→ 

### Allenamento — funzioni nuove
**157. Fix: salvataggio fine allenamento (alleni → torni in Home → non risulta "fatto" → lo rifai)** — 🔴3 · A) ⭐ Salvo il completamento della sessione · B) salta
→ 
**158. Cronometro allenamento (parte e tiene il tempo totale)** — 🟡2 · A) ⭐ Sì · B) salta
→ 
**159. Timer recupero tra serie, super personalizzabile** — 🟡2 · A) ⭐ Sì · B) salta
→ 
**160. Registro pesi per esercizio: ricorda la volta scorsa, segnala se aumenti (progressione)** — 🟡2 · A) ⭐ Sì · B) backlog · C) no
→ 
**161. Modifica/flessibilità allenamento per giornata (sposta esercizi/giorni, più flex)** — 🟡2 · A) ⭐ Sì · B) salta
→ 
**162. (Visione) Allenamento come personal trainer adattivo, dentro il motore di personalizzazione unica (156)** — 🟢1 · A) ci tengo (backlog) · B) no
→ 

### Card con foto / immersività
**163. Foto nelle card (eventi, pasti, allenamenti, viaggi, film): "immersività ma schematizzata bene"** — 🟡2 · A) ⭐ Sì · B) salta
→ 
**164. Fonte delle immagini delle card** — 🟡2 · A) ⭐ Libreria curata per categoria (coerente, veloce) · B) AI-generate (uniche ma variabili) · C) Foto reali da API per dominio (TMDB film, Unsplash/luoghi viaggi, foto ricetta) · D) mix (reali dove esistono, curate come fallback)
→ 

---

### Come rispondere
Basta che scrivi la scelta dopo ogni `→` (A/B/C/salta) e opzionale `urg: N`. Anche solo le voci che ti interessano. Rincollami il file e ti rifaccio la to-do pulita e ordinata.
