import KeikoHomeV4 from "@/app/components/keiko/KeikoHomeV4";
import type { LiveHome, LiveEvent } from "@/app/components/keiko/keikoLive";

/* Anteprima PUBBLICA (fuori auth) della Home v4 con dati d'esempio.
   Serve per vedere il redesign senza login né dev server: apri /ds-preview. */

function mkEv(o: {
  id: string; type: string; emoji: string; catLabel: string; title: string; when: string; location?: string;
}): LiveEvent {
  return {
    id: o.id, type: o.type, art: "", emoji: o.emoji, iconKey: o.type,
    catLabel: o.catLabel, when: o.when, rel: "", time: "", datetime: "",
    title: o.title, heroTitle: o.title, meta: o.location ?? "", location: o.location ?? "",
    mapsQ: o.location ?? o.title, route: null, isFlight: false,
    panelLive: "", panelTitle: o.title, enrichment: null,
  };
}

const WD = ["ven", "sab", "dom", "lun", "mar", "mer", "gio"];
const SAMPLE: LiveHome = {
  kickDate: "Venerdì 17 luglio · Milano 24° ☀️",
  greeting: "Ciao Matteo 👋",
  lede: "",
  week: WD.map((w, i) => ({ w, n: 17 + i, key: w + i, today: i === 0, d1: i === 0 || i === 3, d2: false })),
  cal: { y: 2026, m: 6, dots: [] },
  byDay: {},
  days: {},
  heroEvents: [
    mkEv({ id: "1", type: "concert", emoji: "🎤", catLabel: "Concerto · dom 20", title: "Ultimo — Stadio San Siro", when: "dom 20 · 21:00", location: "Stadio San Siro, Via Piccolomini 5" }),
  ],
  upcoming: [
    mkEv({ id: "2", type: "flight", emoji: "✈️", catLabel: "Volo", title: "Milano → Londra", when: "ven 25 · 6:00", location: "MXP → STN" }),
    mkEv({ id: "3", type: "restaurant", emoji: "🍽", catLabel: "Cena", title: "Cena estiva dipartimento", when: "stasera · 21:00", location: "Balera dell'Ortica" }),
  ],
  agenda: [],
  gym: { done: 0, total: 0, trainedToday: false, title: "Riposo", first: null, rest: true, week: [] },
  diet: { nextPasto: "Colazione", nextOpt: "Yogurt greco 0% 200g + mandorle 30g", done: [] },
  trip: { title: "Weekend a Roma", range: "12–14 lug", sub: "" },
  watch: { count: 4, title: "Dune · Parte due", sub: "Sky · 21:15" },
};

export default function DsPreview() {
  return <KeikoHomeV4 live={SAMPLE} demo />;
}
