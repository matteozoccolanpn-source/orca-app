// Reusable event ticket card component
interface TicketProps {
  emoji: string;
  title: string;
  datetime: string;
  location: string;
}

export default function Ticket({ emoji, title, datetime, location }: TicketProps) {
  return (
    <div className="relative flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-5 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/8">
      {/* Subtle left accent line */}
      <div className="absolute left-0 top-4 bottom-4 w-[2px] rounded-full bg-blue-400/30" />

      {/* Title row */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">{emoji}</span>
        <h3 className="text-base font-semibold tracking-wide text-white">{title}</h3>
      </div>

      {/* Meta row */}
      <div className="flex flex-col gap-1 pl-[44px] text-sm text-white/50">
        <span>{datetime}</span>
        <span>{location}</span>
      </div>
    </div>
  );
}
