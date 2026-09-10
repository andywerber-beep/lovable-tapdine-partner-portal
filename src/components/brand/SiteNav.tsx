import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
        <Logo size={30} />
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="/#how" className="transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="/#value" className="transition-colors hover:text-foreground">
            Why partners join
          </a>
        </nav>
        <Link
          to="/sign-in"
          search={{}}
          className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-brand-foreground transition-transform hover:scale-[1.03]"
        >
          Partner sign in
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-surface/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <Logo size={26} subtitle="Partner Portal" />
        <p>© {new Date().getFullYear()} TapDine. Built for venues that move fast.</p>
      </div>
    </footer>
  );
}
