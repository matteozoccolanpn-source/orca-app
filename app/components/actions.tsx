export interface ActionButton {
  label: string;
  href: string;
  icon: string;
}

function mapsUrl(location: string): string {
  if (!location) return "https://www.google.com/maps";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

export function actionsForType(type: string, location: string): ActionButton[] {
  const maps:    ActionButton = { label: "Mappa",        icon: "🗺",  href: mapsUrl(location) };
  const ticket:  ActionButton = { label: "Biglietto",    icon: "🎫",  href: "#" };
  const call:    ActionButton = { label: "Chiama",       icon: "📞",  href: "tel:" };
  const booking: ActionButton = { label: "Prenotazione", icon: "🔖",  href: "#" };

  switch (type) {
    case "train":
    case "flight":
      return [maps, ticket];
    case "restaurant":
      return [call, maps];
    case "hotel":
      return [maps, booking];
    default:
      return [maps];
  }
}

export function ActionBar({ type, location }: { type: string; location: string }) {
  const buttons = actionsForType(type, location);
  return (
    <div className="flex gap-3">
      {buttons.map((btn) => (
        <a
          key={btn.label}
          href={btn.href}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all
            ${buttons.indexOf(btn) === 0
              ? "bg-amber-400/20 text-amber-300 hover:bg-amber-400/30 border border-amber-400/20"
              : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            }`}
        >
          <span>{btn.icon}</span>
          <span>{btn.label}</span>
        </a>
      ))}
    </div>
  );
}
