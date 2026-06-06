"use client";

interface Category {
  key: string;
  label: string;
  emoji: string;
}

const CATEGORIES: Category[] = [
  { key: "all", label: "Tutti", emoji: "" },
  { key: "train", label: "Treni", emoji: "🚆" },
  { key: "flight", label: "Voli", emoji: "✈️" },
  { key: "concert", label: "Concerti", emoji: "🎵" },
  { key: "hotel", label: "Hotel", emoji: "🏨" },
  { key: "museum", label: "Musei", emoji: "🎨" },
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
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {CATEGORIES.map((cat) => {
        const count = cat.key === "all" ? totalCount : (counts[cat.key] ?? 0);
        const isActive = activeCategory === cat.key;

        return (
          <button
            key={cat.key}
            type="button"
            onClick={() => onSelect(cat.key)}
            className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-muted"
            }`}
          >
            {cat.emoji && <span>{cat.emoji}</span>}
            <span>{cat.label}</span>
            {count > 0 && (
              <span
                className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                  isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted-foreground/20 text-muted-foreground"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
