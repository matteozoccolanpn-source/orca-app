// Server-side only — AIRTABLE_* env vars must never reach the client bundle.

export interface Ticket {
  id: string;
  emoji: string;
  title: string;
  datetime: string;
  location: string;
  type: string;
}

/** Maps the Airtable "Type" field value to an emoji. */
function emojiForType(type: string | undefined): string {
  switch (type?.toLowerCase()) {
    case "train":      return "🚆";
    case "flight":     return "✈️";
    case "concert":    return "🎤";
    case "hotel":      return "🏨";
    case "museum":     return "🏛️";
    case "restaurant": return "🍽️";
    default:           return "📌";
  }
}

/**
 * Fetches upcoming events from Airtable, filtered by Datetime > NOW()
 * and sorted by Datetime ascending. Returns at most 20 records.
 *
 * Safe to call only from Server Components or Route Handlers.
 */
export async function getUpcomingTickets(): Promise<Ticket[]> {
  const apiKey    = process.env.AIRTABLE_API_KEY;
  const baseId    = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_TABLE_NAME;

  if (!apiKey || !baseId || !tableName) {
    console.error(
      "Airtable: missing environment variables (AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME)"
    );
    return [];
  }

  const params = new URLSearchParams({
    filterByFormula: `AND(IS_AFTER({Datetime}, NOW()), NOT(FIND("[PABLO]", {Title})))`,
    "sort[0][field]": "Datetime",
    "sort[0][direction]": "asc",
    maxRecords: "20",
  });

  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?${params}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      // Revalidate every 60 s so the page stays reasonably fresh without
      // hammering Airtable on every request.
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new Error(`Airtable responded with ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.records.map((record: any): Ticket => {
      const f = record.fields ?? {};
      return {
        id:       record.id,
        emoji:    emojiForType(f.Type),
        title:    f.Title ?? f.Name ?? "Untitled",
        datetime: f.Datetime ?? "",
        location: f.Location ?? "",
        type:     (f.Type ?? "").toLowerCase(),
      };
    });
  } catch (err) {
    console.error("Airtable: failed to fetch upcoming tickets:", err);
    return [];
  }
}
