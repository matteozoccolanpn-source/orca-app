# Keiko — i 60 punti, commentati uno per uno
### 11 agosto 2026

**Come leggere le risposte.** Sotto ogni punto: come si fa, quanto costa, e i
paletti se ce ne sono.

- **S** = meno di mezz'ora · **M** = qualche ora · **L** = un giorno o più ·
  **XL** = un progetto a sé
- 🚫 = non si può fare così, c'è un vincolo
- ✅ = è già fatto o già in lista
- ⚠️ = si può fare, ma con una condizione

---

## SEZIONE HOME

**1. Ridurre lo spazio tra la search bar e il saluto «Ciao Matteo».**
Una riga di CSS: il margine di `.greet` nel foglio V2. **S**
⚠️ Cambia il mock congelato della Home, quindi va aggiornato anche lì — ma è
esattamente il tipo di correzione che l'uso vero deve poter fare al disegno.

**2. Calendario nella barra ToDo: uniformare i chip data.**
È il `CalendarSheet`, 61 righe ancora nel vestito vecchio. Si rifà con i
componenti V2 e le pillole della striscia settimanale, così i due calendari
dell'app si somigliano. **M**

**3. Wording «Aggiungi promemoria»: alternative.**
Quattro proposte, in ordine di quanto suonano come Keiko:
«Cosa non devi dimenticare» · «Aggiungi qualcosa da fare» · «Segna una cosa» ·
«Ricordami che…». La prima è la più tua: è una domanda, non un'etichetta. **S**

**4. Ricerca intelligente per allegare info a un evento («Europei nuoto», «weekend F1»).**
Questa è grossa e va scomposta: serve una ricerca web che capisca l'evento,
estragga date e orari, e li scriva nel promemoria. Il meccanismo esiste già in
`/api/cucina/estrai` (dai un link, ne ricava una ricetta strutturata) e in
`/api/watch/search`. Riusare quel pattern è la strada. **L**
⚠️ Il rischio è la precisione: un orario sbagliato in agenda è peggio di nessun
orario. Deve mostrare cosa ha trovato e farti confermare, non scrivere e basta.

**5. «In arrivo» a carosello orizzontale.**
Si riusa `.shelf` con lo scroll-snap che abbiamo già messo ai chip, così non si
ferma a metà card. **S** ✅ già in lista
⚠️ Cambia il mock congelato.

**6. Apertura card evento: uniformare l'UI.**
È `EventSheet`, 150 righe nel vestito vecchio. `Sheet` + `SheetHero` + righe
azione. **M** ✅ già in lista

**7. Icone/emoticon nelle card: set coerente.**
Il set esiste già: `app/components/v2/icons.tsx`, 40 icone a tratto 1.8. Il
lavoro è sostituire le emoji con quelle. **M** ✅ già in lista (punto 14 del
prompt 08)

**8. Click «Modifica card»: uniformare l'UI di modifica.**
Stesso lavoro del 6, sull'altro foglio. **M**

**9. «Oggi per te»: manca la foto di copertina nelle card.**
`Content` accetta già una foto, e `catFor`/`glyphFor` producono il gradiente di
categoria quando la foto manca. Va collegato. **S**

**10. Card allenamento in «Oggi per te»: overlay dentro la Home con avvia / segna fatto / vai alla pagina.**
Si fa con `Sheet` + righe azione, e le azioni esistono già come rotte
(`/api/workout/log`, la sessione). **M**

**11. TUTTE le card: al click un'anteprima in sovrimpressione, non la pagina.**
Questo è il punto più importante di tutta la lista, e non è un dettaglio: è un
**cambio di modello di navigazione**. Oggi la card è un link, diventerebbe un
pannello. Il guadagno è reale — resti dove sei e agisci — ma tocca ogni card
dell'app. **L**
Suggerimento: farlo prima su una sola sezione (Home), vederlo funzionare, poi
estenderlo. Non tutte insieme.

**12. Tasto «+»: uniformare l'UI, migliorare visibilità e wording.**
Attenzione: il revisore esterno ha detto che il «+» è **la cosa più preziosa
dell'app** e la più fragile — l'unico imbuto che digerisce testo e screenshot in
qualsiasi dominio. Il suo consiglio, e lo condivido: rivestilo e **insegna cosa
fa**, ma non frammentarlo in form specifici per renderlo più chiaro. **M**

**13. Saluto dinamico contestuale legato all'ora e al prossimo impegno.**
L'ora c'è già («Buongiorno/Buon pomeriggio/Buonasera»). Legarlo al prossimo
impegno è una riga in più nella `.status`, che quel dato ce l'ha. **S**

**14. Riepilogo giornata cliccabile.**
Apre il `DaySheet`, che esiste già. È collegare, non costruire. **S**

**15. Swipe sulle card per azioni rapide (fatto / rimanda / elimina).**
Bello e utile, ma va progettato col gesto laterale fra pagine (punto della lista
precedente): due swipe orizzontali sullo stesso schermo litigano. **L**
⚠️ Deciderne uno solo, o dare al gesto sulle card una soglia diversa.

**16. Stati vuoti curati quando non c'è niente nel giorno.**
Il componente `Empty` esiste. Vanno scritte le frasi, che è la parte che conta:
uno stato vuoto è una frase, non un'icona. **S**

**17. Micro-animazioni coerenti all'apertura degli overlay.**
`framer-motion` è già nel progetto e i fogli V2 hanno già l'entrata. Va reso
uguale ovunque. **M**

**18. Indicatore «oggi» più chiaro e scorrimento a settimane passate/future.**
L'indicatore è **S**. Lo scorrimento fra settimane è **M**, e serve che i dati
di una settimana diversa arrivino — oggi `page.tsx` calcola quella corrente.

**19. Ordine delle sezioni personalizzabile (drag & drop).**
Si può, ma è **XL** e ti consiglio di non farlo: serve un posto dove salvare
l'ordine, una UI per riordinare, e ogni sezione deve diventare indipendente.
Costa più di dieci punti di questa lista e lo useresti una volta.

**20. Badge/notifiche sulle card per azioni in sospeso.**
Il dato c'è (i to-do aperti, l'allenamento non fatto). È disegnare il pallino e
collegarlo. **M**
⚠️ Con misura: un'app che ti mette il bollino rosso addosso smette di essere
sobria.

---

## SEZIONE CUCINA

**21. La prima cosa visibile è il PROSSIMO pasto, con i passati sopra e i successivi sotto.**
`PastoDelGiorno` ha già il concetto di «passato», deciso dall'orologio. Il
lavoro è l'impaginazione: il prossimo in evidenza, gli altri collassati.
**M** — ed è il punto che cambia più cose in meglio nella Cucina.

**22. Per ogni pasto: «mangiato questo» / «non seguito» / «cambiato».**
Si fa, e va fatto. Ma serve una tabella dove scriverlo: oggi il piano si legge e
non si annota. **L** (una migrazione piccola + le rotte)
🚫 **Paletto**: registra la tua scelta, **non** dire se va bene. Nessun
confronto col piano, nessun giudizio.

**23. Un ricettario dedicato e ben strutturato dentro Cucina.**
Esiste già (`salvate`, `tutte`, lo scaffale) ed è appena passato al vestito
nuovo. Se ti sembra povero, dimmi cosa manca: ricerca? cartelle? preferiti? **S–M**

**24. Video e foto in stile TikTok, full screen scorrevole.**
🚫 Non come lo immagini. Nel codice c'è una decisione scritta: **il video non si
incorpora e non si copia**, si apre su TikTok/YouTube, così la visualizzazione
va a chi l'ha girato. Incorporarli in un feed nostro è contro le condizioni
delle piattaforme e toglie le viste al creator.
✅ Quello che si può fare: una griglia verticale immersiva **di copertine**, che
al tocco apre il video sulla piattaforma. **M**

**25. Click su QUALSIASI cibo → scheda unica con spesa, istruzioni e «Cucina con Keiko».**
Le prime due parti esistono già dentro il foglio ricetta. «Cucina con Keiko»
passo-per-passo **non esiste**: nel codice i passi sono un elenco, non una
sequenza. **L**
È la stessa cosa che ho tolto dall'ondata Cucina proprio perché è una funzione
nuova, non un vestito.

**26. Allineare un pasto del ricettario a «cosa mangio oggi», e aggiornare il diario.**
Dipende dal 22: serve prima il posto dove annotare. Poi è collegare. **M dopo il 22**
🚫 Stesso paletto: l'app registra la sostituzione, non la approva.

**27. Notifica all'ora dei pasti: «hai mangiato come da dieta?»**
Le notifiche push esistono già (`public/sw.js`, `/api/beats/close`). **M**
⚠️ Il testo va cambiato: «hai mangiato **come da dieta**?» è una domanda che
giudica. «Cosa hai mangiato?» registra. La differenza non è formale.

**28. Storico di tutto ciò che è stato mangiato, consultabile a colpo d'occhio.**
Diretta conseguenza del 22: se annoti, hai lo storico. **M dopo il 22**

**29. Lista della spesa settimanale generata dai pasti pianificati.**
La spesa esiste (`/api/cucina/spesa`) e ha già `dalPiano`. Estenderla alla
settimana è aggregare. **M**

**30. Riconoscimento del cibo da foto per stimare porzioni e macro.**
⚠️ Metà sì, metà no. Riconoscere **cosa** è e registrarlo: sì, ed è il
meccanismo che già usi per la scheda del PT. Stimare **porzioni e macro**: è
interpretazione nutrizionale, e l'app non la fa. **L** per la parte lecita.

**31. Riepilogo nutrizionale con confronto vs. piano della nutrizionista.**
🚫 **Questo no.** È esattamente la riga che Keiko non attraversa: interpretare
dati sanitari e giudicare se quello che hai mangiato è conforme. Non è
prudenza, è il vincolo che tiene in piedi tutto il resto.
✅ Quello che si può fare: mostrarti **cosa hai mangiato**, senza commento e
senza confronto. Il giudizio lo fa la nutrizionista.

**32. Suggerimenti di sostituzione equivalenti.**
✅ Esiste già e funziona bene: è lo scambio alimento in Dieta, con
`DietSwap.tsx`. Il revisore esterno l'ha citato come una delle cose migliori
dell'app. Se vuoi, si porta anche dentro Cucina. **M**

**33. Filtri e ricerca nel ricettario.**
`/api/cucina/search` accetta già dei parametri. È esporli. **M**

**34. Integrazione lista spesa con consegna o esportazione.**
`amazonFresh` c'è già nel codice. L'esportazione come lista testuale è **S**;
un'integrazione vera con un servizio è **XL**.

**35. Salvare ricette dai social incollando il link.**
✅ **Esiste già**: `/api/cucina/estrai`, e l'abbiamo verificato ieri — dai un
URL e ne ricava titolo, ingredienti e passi. Se non lo trovi nell'interfaccia,
è un problema di dove sta il bottone. **S**

**36. Promemoria idratazione e integratori.**
Si fa con le notifiche. **M**
⚠️ Gli integratori sfiorano il sanitario: promemoria sì, dosaggi no.

**37. Modalità cucina a mani libere, schermo acceso, avanzamento vocale.**
Lo schermo sempre acceso è **S** (`Screen Wake Lock`). L'avanzamento vocale
dipende dal 25: serve prima che i passi siano una sequenza. **L**

---

## SEZIONE ALLENAMENTO

**38. Riconoscere automaticamente la modalità di registrazione dal tipo di allenamento.**
✅ **Fatto e in produzione.** `lib/discipline.ts`: Corsa Z2 → corsa, campi
distanza/durata/battito, niente ripetizioni. Se sul telefono vedi ancora i
chili, è la versione vecchia in cache — chiudi l'app dallo switcher e riapri.

**39. «1 serie segnate…»: non è chiaro cosa sia.**
Reale, ed è già il punto 6 del prompt 08: quella riga convive con «prima volta
che lo segni» e si contraddicono. Deciso: la fonte di verità sono le serie di
oggi. **S** ✅ in corso

**40. Entrare in «A che punto sei» e vedere la settimana e le settimane passate.**
`storicoSedute` arriva già dal server. Serve una pagina che lo mostri: una vista
settimanale con quello che hai fatto. **L**
⚠️ Senza inventare tendenze: con due sedute non si disegna una curva.

**41. Inserire uno screenshot dell'allenamento e farlo capire a Keiko.**
✅ Già in `docs/ROADMAP.md`. Il meccanismo esiste identico per la scheda del PT
(`/api/workout/upload` → `generate`). **L**
Qui Keiko trascrive quello che **hai fatto**, non propone: resta dentro il
vincolo.

**42. Pulsante «Fatto»: troppo grande e fatto male.**
Ridimensionare e rivestire. **S**

**43. Import da Apple Health, Garmin, Strava.**
**XL**, e ognuno è un progetto suo con la propria autenticazione. Consiglio: fai
prima il 41 (lo screenshot), che copre l'80% del bisogno con il 10% del lavoro.

**44. Grafici di progresso nel tempo.**
Il dato c'è per i pesi, e da oggi anche per corsa e nuoto. **L**
⚠️ Va aspettato che ci sia storia: un grafico con tre punti mente.

**45. Calendario/heatmap degli allenamenti fatti vs programmati.**
`trainedDays` e `weekPlanned` esistono già. **M**

**46. Timer/cronometro per serie, recuperi e allenamenti a tempo.**
È il `.giant` che il mock disegna e il codice non ha. **M**
È la funzione nuova che Code ha giustamente rifiutato di inventare durante il
restyling: se la vuoi, ora si può chiedere apposta.

**47. Storico per singolo esercizio con «l'ultima volta» e progressione suggerita.**
«L'ultima volta» ✅ esiste. Lo storico per esercizio è **M**.
🚫 La **progressione suggerita** no: la scheda è del preparatore, Keiko non
propone carichi.

**48. Feedback post-allenamento e RPE.**
Il campo `sensazione` **esiste già in tabella e nessuna schermata lo scrive** —
è in ROADMAP. `fatica` per serie c'è da oggi. **M**

**49. Uniformare card e pulsanti di Allenamento al resto.**
✅ Fatto nell'ondata 3, e le rifiniture sono nel prompt 08.

**50. Notifiche intelligenti per l'allenamento del giorno.**
Le push ci sono. **M**
⚠️ «Intelligenti» va definito: un promemoria all'ora giusta sì; un'app che ti
rimprovera se salti, no. Non è il carattere di Keiko.

---

## SEZIONE GUARDA

**51. Click su un titolo → anteprima in sovrimpressione con «dove vederlo», trailer, azioni rapide.**
La scheda esiste già come foglio con «Dove vederlo». Il **trailer** no: servirebbe
il video da TMDB. **M** senza trailer, **L** con.
Il punto 11 e questo sono lo stesso lavoro: fallo una volta, valelo per tutta
l'app.

**52. Uniformare card e chip filtro.**
✅ Fatto nell'ondata 2; le rifiniture sono nel prompt 08 (punti 4, 11, 20).

**53. «Stasera per te» contestuale (tempo disponibile, umore, con chi guardi).**
Oggi il titolo è scelto con `Math.random()` — è in ROADMAP come «serve una
regola vera». Il tuo è il livello sopra: chiedere il contesto. **L**
✅ Il tempo disponibile l'app lo sa già (la durata del film contro la tua serata).

**54. Sincronizzazione «visto/da vedere» fra dispositivi.**
✅ **Già così**: lo stato è su Supabase, non sul telefono. Se ti sembra che non
si sincronizzi, è un bug e va guardato come tale.

---

## TRASVERSALI

**55. Definire un design system unico.**
✅ **Esiste già**, scritto e in codice: `docs/UI-DECISIONI-V2.md` (il manifesto)
e `app/keiko-v2.css` (452 regole, generate dal mock). Non va definito, va
**finito di applicare** — ed è metà dei punti di questa lista.

**56. Sostituire le emoji con un set di icone custom.**
Il set esiste (`icons.tsx`, 40 icone). ✅ in corso nel prompt 08.
Eccezione da tenere: l'emoji del battito **è** dato, non decorazione.

**57. Standardizzare «click card → overlay con azioni rapide» in ogni sezione.**
È il punto 11 promosso a regola di sistema, e sono d'accordo che lo diventi.
Va scritto nel manifesto, non solo implementato. **L**

**58. Rivedere tutto il microcopy con un tono coerente.**
✅ Il tono esiste ed è forte — «Keiko la trascrive e se la ricorda, non la
scrive», «Quando basta, basta». Il revisore esterno l'ha notato da solo. Il
lavoro è **portarlo dove ancora non c'è**, non ridefinirlo. **M**

**59. Stati vuoti, caricamento ed errore curati e uniformi.**
`Empty` e `Skeleton` esistono. Manca il caricamento **per sezione**: c'è un solo
`app/loading.tsx` e mostra il logo vecchio. **M** ✅ già in lista

**60. Accessibilità: tap target, contrasto, leggibilità.**
Il sistema lo impone già (4.5:1, campi a 16px, tocchi da 44px) e le ultime
ondate lo verificano a ogni giro. Quello che manca è un **controllo unico** su
tutta l'app invece che sezione per sezione. **M**

---

## Come li metterei in fila

**Adesso — chiude quello che è aperto**
Il prompt 08 (20 correzioni), poi i quattro fogli vecchi in un'ondata sola:
profilo, calendario, «Chiedi a Keiko», card che si aprono. Copre i punti 2, 6,
7, 8, 12, 56, 59.

**Poi — la cosa che cambia il modello, una volta sola**
Il punto 11/57: click sulla card → pannello con azioni. Prima solo sulla Home,
poi esteso. Copre 10, 11, 14, 51, 57.

**Poi — la Cucina che annota**
Il punto 22 con la sua tabella, e da lì cadono 26, 28, 21 e metà del 27.
È il blocco che rende l'app **utile** e non solo bella.

**Poi — l'allenamento che si guarda indietro**
40, 45, 48 (il campo `sensazione` esiste e nessuno lo scrive), 46 se vuoi il
timer.

**Non li farei**
19 (ordine drag & drop: costa più di dieci punti e lo usi una volta) e 43
(integrazioni Strava/Garmin: fai il 41, copre l'80% col 10% del lavoro).

**Non si possono fare così**
31 (confronto col piano), 24 (video incorporati), 47 nella parte «progressione
suggerita», 30 nella parte «stima macro». Per ognuno c'è scritto sopra cosa si
può fare invece.
