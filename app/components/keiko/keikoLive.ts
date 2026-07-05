// TAPPA 2 — mappa i dati veri di Supabase nella forma che la UI congelata
// (KeikoPreview) sa già disegnare. Regola: "mostra ciò che esiste, compatta
// ciò che manca". Il CSS non si tocca: se un dato non c'è, si adatta il contenuto.
// Testi fissi da docs/UI-VOICE.md; barra "Cerca in Keiko" dal mockup.
import type { Ticket, DietWeek, WorkoutWeek, TripPlanRow, Todo, WatchItem } from "@/lib/supabase";

const WD_SHORT = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
const WD_LONG = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function hhmm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function relDay(iso: string, today: Date): string {
  const d = new Date(iso);
  const k = dayKey(d);
  if (k === dayKey(today)) return "oggi";
  const tom = new Date(today); tom.setDate(today.getDate() + 1);
  if (k === dayKey(tom)) return "domani";
  return `${WD_SHORT[d.getDay()]} ${d.getDate()}`;
}
function countdownDays(iso: string, today: Date): number {
  const a = new Date(iso); a.setHours(0, 0, 0, 0);
  const b = new Date(today); b.setHours(0, 0, 0, 0);
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

const TYPE_LABEL: Record<string, string> = { train: "Treno", flight: "Volo", hotel: "Hotel", concert: "Concerto", museum: "Museo", restaurant: "Ristorante", sport: "Sport" };
const ART_CLASS: Record<string, string> = { train: "train", restaurant: "dinner", flight: "flightA", concert: "concertA", museum: "concertA", sport: "sportA", hotel: "hotel" };
// mappa il tipo evento a una delle 5 icone categoria disegnate (.ci)
const CAT_ICON: Record<string, string> = { train: "treno", restaurant: "cena", flight: "volo", concert: "concerto", sport: "gp", museum: "concerto", hotel: "cena" };
export function typeLabel(t: string) { return TYPE_LABEL[t?.toLowerCase()] ?? "Evento"; }
export function artClass(t: string) { return ART_CLASS[t?.toLowerCase()] ?? "train"; }
export function catIconKey(t: string) { return CAT_ICON[t?.toLowerCase()] ?? "treno"; }
export function mapsUrl(q: string) { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`; }

function routeStations(title: string, location: string | null): { dep: string; arr: string } | null {
  const parts = title.split(/\s*(?:→|➜|—)\s*|\s+-\s+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const strip = (s: string) => s.replace(/^(treno|volo|bus|nave|aereo)\s+/i, "").trim();
  const arr = strip(parts[parts.length - 1]);
  const dep = strip(location || parts[0]);
  return dep && arr ? { dep, arr } : null;
}

export type LiveEvent = {
  id: string; type: string; art: string; emoji: string; iconKey: string;
  catLabel: string; when: string; rel: string; time: string;
  title: string; heroTitle: string; meta: string; location: string; mapsQ: string;
  route: { dep: string; arr: string } | null; isFlight: boolean;
  panelLive: string; panelTitle: string;
};
export type LiveHome = {
  kickDate: string; greeting: string; lede: string;
  week: { w: string; n: number; key: string; today: boolean; d1: boolean; d2: boolean }[];
  cal: { y: number; m: number; dots: number[] };
  byDay: Record<string, { title: string; rows: string[] }>;
  heroEvents: LiveEvent[];
  upcoming: LiveEvent[];
  agenda: { label: string; events: LiveEvent[] }[];
  gym: { done: number; total: number; trainedToday: boolean; title: string; first: string | null; rest: boolean; week: { letter: string; on: boolean; today: boolean }[] } | null;
  diet: { nextPasto: string | null; nextOpt: string | null; done: string[] } | null;
  trip: { title: string; range: string; sub: string } | null;
  watch: { count: number; title: string | null; sub: string } | null;
};

function toEvent(e: Ticket, today: Date): LiveEvent {
  const t = e.type?.toLowerCase();
  const route = t === "train" || t === "flight" ? routeStations(e.title, e.location) : null;
  const time = hhmm(e.datetime);
  const rel = relDay(e.datetime, today);
  const heroTitle = route
    ? t === "flight" ? `${route.arr}, si parte alle ${time}.` : `Parti alle ${time}.`
    : e.title;
  return {
    id: e.id, type: e.type, art: artClass(e.type), emoji: e.emoji, iconKey: catIconKey(e.type),
    catLabel: typeLabel(e.type), when: `${rel} · ${time}`, rel, time,
    title: e.title, heroTitle, meta: e.location || "", location: e.location || "", mapsQ: e.location || e.title,
    route, isFlight: t === "flight",
    panelLive: `${rel.toUpperCase()} · ${typeLabel(e.type).toUpperCase()}`,
    panelTitle: heroTitle,
  };
}

export function mapLive(data: {
  events: Ticket[]; todos: Todo[]; diet: DietWeek | null; workout: WorkoutWeek | null;
  trainedDays: string[]; trips: TripPlanRow[]; watch: WatchItem[];
}): LiveHome {
  const today = new Date();
  const todayKey = dayKey(today);

  // --- settimana: 14 giorni da oggi, con pallini eventi (d1) / to-do (d2) ---
  const evByDay = new Map<string, Ticket[]>();
  for (const e of data.events) { const k = dayKey(new Date(e.datetime)); (evByDay.get(k) ?? evByDay.set(k, []).get(k)!).push(e); }
  const tdByDay = new Map<string, Todo[]>();
  for (const t of data.todos) (tdByDay.get(t.day) ?? tdByDay.set(t.day, []).get(t.day)!).push(t);

  const base = new Date(today); base.setHours(0, 0, 0, 0);
  const week = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(base); d.setDate(base.getDate() + i); const k = dayKey(d);
    return { w: WD_SHORT[d.getDay()], n: d.getDate(), key: k, today: k === todayKey, d1: (evByDay.get(k)?.length ?? 0) > 0, d2: (tdByDay.get(k)?.length ?? 0) > 0 };
  });

  // --- byDay per peek / day panel (righe testuali) ---
  const byDay: LiveHome["byDay"] = {};
  const allKeys = new Set<string>([...evByDay.keys(), ...tdByDay.keys()]);
  for (const k of allKeys) {
    const d = new Date(k + "T00:00:00");
    const rows = [
      ...(evByDay.get(k) ?? []).sort((a, b) => a.datetime.localeCompare(b.datetime)).map((e) => `<b>${hhmm(e.datetime)}</b> ${e.emoji} ${e.title}`),
      ...(tdByDay.get(k) ?? []).map((t) => `${t.done ? "✓" : "◦"} ${t.time ? `<b>${t.time}</b> ` : ""}${t.text}`),
    ];
    byDay[k] = { title: `${WD_LONG[d.getDay()]} ${d.getDate()}`, rows };
  }

  // --- calendario: mese corrente, pallini sui giorni con eventi/to-do ---
  const calDots = [...allKeys]
    .map((k) => new Date(k + "T00:00:00"))
    .filter((d) => d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth())
    .map((d) => d.getDate());

  // --- hero = SOLO eventi di oggi (regola). Se oggi vuoto → primo evento futuro. ---
  const future = data.events
    .map((e) => ({ e, t: new Date(e.datetime).getTime() }))
    .filter((x) => x.t >= Date.now())
    .sort((a, b) => a.t - b.t)
    .map((x) => x.e);
  const todayEvents = future.filter((e) => dayKey(new Date(e.datetime)) === todayKey);
  const heroSrc = todayEvents.length > 0 ? todayEvents : future.slice(0, 1);
  const heroIds = new Set(heroSrc.map((e) => e.id));
  const upcomingSrc = future.filter((e) => !heroIds.has(e.id));
  const heroEvents = heroSrc.map((e) => toEvent(e, today));
  const upcoming = upcomingSrc.map((e) => toEvent(e, today));

  // --- agenda: raggruppa i futuri per fascia ---
  const agenda: LiveHome["agenda"] = [];
  const push = (label: string, evs: LiveEvent[]) => { if (evs.length) agenda.push({ label, events: evs }); };
  push("Oggi", [...heroEvents, ...upcoming].filter((e) => e.rel === "oggi"));
  push("Prossimi giorni", [...heroEvents, ...upcoming].filter((e) => e.rel !== "oggi"));

  // --- oggi per te: palestra + dieta ---
  const dShort = WD_SHORT[today.getDay()];
  const w = data.workout?.[dShort] ?? null;
  const esercizi = w?.esercizi ?? [];
  const trainedToday = data.trainedDays.includes(todayKey);
  const monday = new Date(base); monday.setDate(base.getDate() - ((base.getDay() + 6) % 7));
  const letters = ["L", "M", "M", "G", "V", "S", "D"];
  const gymWeek = Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); const k = dayKey(d); return { letter: letters[i], on: data.trainedDays.includes(k), today: k === todayKey }; });
  const gym = (w || esercizi.length) ? {
    done: trainedToday ? esercizi.length : 0, total: esercizi.length || 6, trainedToday,
    title: esercizi.length ? (w?.titolo || "Allenamento") : "Riposo",
    first: esercizi[0]?.nome ?? null, rest: !esercizi.length, week: gymWeek,
  } : null;

  const meals = data.diet?.[dShort] ?? null;
  const diet = meals && meals.length ? {
    nextPasto: meals[0]?.pasto ?? null, nextOpt: meals[0]?.opzioni?.[0] ?? null,
    done: meals.slice(1).map((m) => m.pasto),
  } : null;

  // --- ctx viaggio + guarda ---
  const t0 = data.trips[0] ?? null;
  let trip: LiveHome["trip"] = null;
  if (t0) {
    const s = t0.start_date ? new Date(t0.start_date) : null;
    const e = t0.end_date ? new Date(t0.end_date) : null;
    const range = s ? (e && e.getMonth() !== s.getMonth() ? `${s.getDate()} ${MONTHS[s.getMonth()].slice(0, 3)}–${e.getDate()} ${MONTHS[e.getMonth()].slice(0, 3)}` : e ? `${s.getDate()}–${e.getDate()} ${MONTHS[s.getMonth()].slice(0, 3).toUpperCase()}` : `${s.getDate()} ${MONTHS[s.getMonth()]}`) : "";
    const days = s ? countdownDays(t0.start_date!, today) : null;
    trip = { title: t0.city ? `${t0.city}` : "Viaggio", range: range.toUpperCase(), sub: days != null && days > 0 ? `tra ${days} giorni · itinerario pronto ✓` : "itinerario pronto ✓" };
  }

  const notSeen = data.watch.filter((x) => !x.seen);
  const nextWatch = notSeen[0] ?? null;
  const watch = notSeen.length ? { count: notSeen.length, title: nextWatch?.title ?? null, sub: `${notSeen.length} in lista` } : null;

  // --- kicker ---
  const kickDate = `${WD_LONG[today.getDay()]} ${today.getDate()} ${MONTHS[today.getMonth()]}`;
  // voce: "Prossimo: treno per {destinazione}, {giorno} alle {ora}" (dest = titolo breve).
  const h0 = heroSrc[0] ?? null;
  let lede = "Giornata libera 🌿";
  if (h0) {
    const t = h0.type?.toLowerCase();
    const route = t === "train" || t === "flight" ? routeStations(h0.title, h0.location) : null;
    const dest = route ? route.arr : (h0.location || h0.title);
    const cat = typeLabel(h0.type).toLowerCase();
    const soggetto = route ? `${cat} per ${dest}` : h0.title;
    const time = hhmm(h0.datetime);
    const d0 = new Date(h0.datetime); const k0 = dayKey(d0);
    const tom = new Date(today); tom.setDate(today.getDate() + 1);
    const giorno = k0 === todayKey ? "oggi" : k0 === dayKey(tom) ? "domani" : WD_LONG[d0.getDay()].toLowerCase();
    lede = k0 === todayKey ? `Oggi: ${soggetto}, alle ${time}` : `Prossimo: ${soggetto}, ${giorno} alle ${time}`;
  }

  return {
    kickDate, greeting: "Ciao Matteo 👋", lede,
    week, cal: { y: today.getFullYear(), m: today.getMonth(), dots: calDots }, byDay,
    heroEvents, upcoming, agenda, gym, diet, trip, watch,
  };
}
