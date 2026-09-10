import { Link } from "@tanstack/react-router";
import mark from "@/assets/tapdine-mark.png";

export function Logo({
  size = 32,
  withWord = true,
  subtitle,
  onDark = false,
}: {
  size?: number;
  withWord?: boolean;
  subtitle?: string;
  onDark?: boolean;
}) {
  return (
    <Link to="/" className="flex items-center gap-3">
      <span
        className="grid shrink-0 place-items-center rounded-full bg-forest-deep ring-1 ring-gold/40"
        style={{ width: size, height: size, padding: Math.round(size * 0.1) }}
      >
        <img
          src={mark}
          alt="TapDine logo"
          className="h-full w-full object-contain"
        />
      </span>
      {withWord && (
        <span className="leading-none">
          <span className="block font-display text-2xl font-extrabold tracking-tight">
            <span className={onDark ? "text-cream" : "text-foreground"}>Tap</span>
            <span className="text-gold">Dine</span>
          </span>
          {subtitle && (
            <span className="mt-1 block text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
              {subtitle}
            </span>
          )}
        </span>
      )}
    </Link>
  );
}
