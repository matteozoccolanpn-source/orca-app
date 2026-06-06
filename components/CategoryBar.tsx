"use client";

interface Category {
  key: string;
  label: string;
  emoji: string;
}

const CATEGORIES: Category[] = [
  { key: "all",        label: "Tutti",      emoji: "" },
  { key: "train",      label: "Treni",      emoji: "🚆" },
  { key: "flight",     label: "Voli",       emoji: "✈️" },
  { key: "concert",    label: "Concerti",   emoji: "🎵" },
  { key: "hotel",      label: "Hotel",      emoji: "🏨" },
  { key: "museum",     label: "Musei",      emoji: "🎨" },
  { key: "restaurant", label: "Ristoranti", emoji: "🍽️" },
];

interface CategoryBarProps {
  activeCategory: string;
  onSelect: (key: string) => void;
  counts: Record<string, number>;
}

export default function CategoryBar({ activeCategory, onSelect, counts }: CategoryBarProps) {
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div
      className="relative overflow-hidden"
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)",
      }}
    >
      <div className="flex gap-2 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map((cat) => {
          const count = cat.key === "all" ? totalCount : (counts[cat.key] ?? 0);
          const isActive = activeCategory === cat.key;

          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => onSelect(cat.key)}
              className={`flex flex-shrink-0 items-center gap-1 rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-wide transition-all duration-200 ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "border border-border/40 bg-transparent text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              {cat.emoji && <span>{cat.emoji}</span>}
              <span>{cat.label}</span>
              {count > 0 && (
                <span className="ml-0.5 opacity-60 text-[10px]">{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
