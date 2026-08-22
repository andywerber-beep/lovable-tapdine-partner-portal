import { Link } from "@tanstack/react-router";
import mark from "@/assets/tapdine-mark.png";

export function Logo({
  size = 32,
  withWord = true,
  subtitle,
}: {
  size?: number;
  withWord?: boolean;
  subtitle?: string;
}) {
  return (
    <Link to="/" className="flex items-center gap-3">
      <img
        src={mark}
        alt="TAPDINE logo"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0"
      />
      {withWord && (
        <span className="leading-none">
          <span className="block font-display text-lg font-extrabold tracking-[0.2em] text-foreground">
            TAPDINE
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
