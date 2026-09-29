import { Link } from "@tanstack/react-router";
import logoUrl from "@/assets/tapdine-logo.png";

export function Logo({
  size = 32,
  subtitle,
}: {
  size?: number;
  subtitle?: string;
}) {
  return (
    <Link to="/" className="flex items-center gap-3">
      <img src={logoUrl} alt="TapDine" className="w-auto shrink-0 object-contain" style={{ height: size * 1.45, maxWidth: size * 5.4 }} />
      {subtitle && <span className="hidden border-l border-border pl-3 text-xs font-bold text-muted-foreground sm:block">{subtitle}</span>}
    </Link>
  );
}
