"use client";
// K15 — "Aggiungi a schermata Home": rilevamento e regole di garbo.
//
// Perché esiste: su iPhone gli avvisi partono SOLO se Keiko è stata aggiunta
// alla schermata Home e viene aperta da lì. Dal browser il permesso non si può
// nemmeno chiedere: si otterrebbe un rifiuto secco, e un rifiuto su iOS non si
// recupera più. Quindi l'ordine conta:
//
//   1. dal browser  → si mostra SOLO la guida "mettimi nella schermata Home"
//   2. dall'icona   → adesso sì, si chiede il permesso e si spiega cosa arriva
//
// Su Android non serve installare per ricevere gli avvisi, ma se il browser
// offre l'invito a installare lo si usa lo stesso (si apre con un tocco).

import { isIos, pushSupported } from "./push-client";

/** L'invito a installare di Chrome/Android. Il tipo non sta nelle librerie DOM. */
interface InvitoInstallazione extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let invitoAndroid: InvitoInstallazione | null = null;

// Il browser lancia l'invito una volta sola e presto: ci si mette in ascolto
// appena questo file viene caricato, non quando un componente si monta.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();               // niente barretta di sistema: la guida è la nostra
    invitoAndroid = e as InvitoInstallazione;
  });
}

/** true se Keiko è aperta dall'icona invece che dal browser. */
export function daIcona(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
}

/** true se il browser ci ha offerto l'invito a installare (Android/Chrome). */
export function invitoAndroidPronto(): boolean {
  return invitoAndroid !== null;
}

/** Apre l'invito di sistema. true se l'utente ha accettato. */
export async function installaDaAndroid(): Promise<boolean> {
  if (!invitoAndroid) return false;
  const invito = invitoAndroid;
  invitoAndroid = null;               // l'invito si può usare una volta sola
  try {
    await invito.prompt();
    const { outcome } = await invito.userChoice;
    return outcome === "accepted";
  } catch {
    return false;
  }
}

/** true se il permesso avvisi si può ancora chiedere (né dato né negato). */
function permessoDaChiedere(): boolean {
  if (!pushSupported() || typeof Notification === "undefined") return false;
  return Notification.permission === "default";
}

export type CosaMostrare = "guida-ios" | "guida-android" | "avvisi" | null;

/**
 * Cosa proporre adesso, nell'ordine della sequenza. Legge solo lo stato del
 * momento: il "non insistere" lo decide `daProporre()`.
 */
export function cosaMostrare(): CosaMostrare {
  if (typeof window === "undefined") return null;
  // 1. dal browser su iPhone: prima la schermata Home, gli avvisi vengono dopo
  if (isIos() && !daIcona()) return "guida-ios";
  // 2. Android col suo invito pronto: si apre con un tocco
  if (!daIcona() && invitoAndroidPronto()) return "guida-android";
  // 3. siamo dove gli avvisi funzionano: si può chiedere il permesso
  if (permessoDaChiedere()) return "avvisi";
  return null;
}

// ── Non insistere ───────────────────────────────────────────────────────────
// Chi chiude la guida non la rivede il giorno dopo. Le attese crescono, e alla
// terza chiusura Keiko smette di chiedere: resta la voce nel Profilo, sempre.
const CHIAVE = "keiko-invito-home";
const ATTESE_GIORNI = [7, 30];        // 1ª chiusura → 7 giorni, 2ª → 30, 3ª → mai più
const GIORNO = 24 * 60 * 60 * 1000;

interface Rinvio { quando: number; volte: number }

function leggiRinvio(): Rinvio | null {
  try {
    const raw = localStorage.getItem(CHIAVE);
    if (!raw) return null;
    const r = JSON.parse(raw) as Rinvio;
    return typeof r?.quando === "number" && typeof r?.volte === "number" ? r : null;
  } catch {
    return null;
  }
}

/** true se è il momento di riproporre (o se non è mai stata chiusa). */
export function daProporre(): boolean {
  const r = leggiRinvio();
  if (!r) return true;
  const attesa = ATTESE_GIORNI[r.volte - 1];
  if (attesa === undefined) return false;          // chiusa 3 volte: basta così
  return Date.now() - r.quando >= attesa * GIORNO;
}

/** L'utente ha chiuso la guida: si rimanda, non si ripropone domani. */
export function rimanda(): void {
  const r = leggiRinvio();
  try {
    localStorage.setItem(CHIAVE, JSON.stringify({ quando: Date.now(), volte: (r?.volte ?? 0) + 1 }));
  } catch { /* niente localStorage: pazienza, si riproporrà */ }
}

/** Gli avvisi sono attivi (o la guida non serve più): si azzera il conteggio. */
export function dimenticaRinvio(): void {
  try { localStorage.removeItem(CHIAVE); } catch { /* no-op */ }
}
