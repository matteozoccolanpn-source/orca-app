// Meteo da Open-Meteo (gratis, NESSUNA chiave). Dato un luogo/città restituisce
// temperatura attuale + icona. Due passi: geocoding (nome → lat/lon) e forecast.
// Senza risultato → null.

export type Weather = { tempC: number; emoji: string; text: string };

// Codici meteo Open-Meteo → icona + testo (WMO weather codes, semplificati).
function decode(code: number): { emoji: string; text: string } {
  if (code === 0) return { emoji: "☀️", text: "sereno" };
  if (code <= 2) return { emoji: "🌤️", text: "poco nuvoloso" };
  if (code === 3) return { emoji: "☁️", text: "nuvoloso" };
  if (code <= 48) return { emoji: "🌫️", text: "nebbia" };
  if (code <= 67) return { emoji: "🌧️", text: "pioggia" };
  if (code <= 77) return { emoji: "❄️", text: "neve" };
  if (code <= 82) return { emoji: "🌦️", text: "rovesci" };
  if (code <= 99) return { emoji: "⛈️", text: "temporale" };
  return { emoji: "🌡️", text: "" };
}

export async function weatherFor(place: string): Promise<Weather | null> {
  const q = (place ?? "").split(",")[0].trim();
  if (!q) return null;
  try {
    const geo = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?count=1&language=it&name=${encodeURIComponent(q)}`,
      { next: { revalidate: 2592000 } }
    );
    if (!geo.ok) return null;
    const gd = await geo.json();
    const loc = gd?.results?.[0];
    if (!loc) return null;
    const fc = await fetch(
      `https://api.open-meteo.com/v1/forecast?current=temperature_2m,weather_code&latitude=${loc.latitude}&longitude=${loc.longitude}`,
      { next: { revalidate: 1800 } } // 30 min
    );
    if (!fc.ok) return null;
    const fd = await fc.json();
    const t = fd?.current?.temperature_2m;
    const code = fd?.current?.weather_code;
    if (typeof t !== "number" || typeof code !== "number") return null;
    const { emoji, text } = decode(code);
    return { tempC: Math.round(t), emoji, text };
  } catch {
    return null;
  }
}
