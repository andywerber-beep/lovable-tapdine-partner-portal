import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import heroImg from "@/assets/hero-service.jpg";

export const Route = createFileRoute("/sign-in")({
  head: () => ({
    meta: [
      { title: "Partner Sign In — TAPDINE" },
      {
        name: "description",
        content:
          "Sign in to the TAPDINE partner portal to publish offers, add photos, set expiry times and link your menu.",
      },

      { property: "og:title", content: "Partner Sign In — TAPDINE" },
      {
        property: "og:description",
        content: "Access your TAPDINE venue workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [show, setShow] = useState(false);

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden lg:block">
        <img
          src={heroImg}
          alt="Restaurant kitchen pass during evening service"
          width={1600}
          height={1104}
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-background via-background/80 to-brand/20" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo size={32} subtitle="Partner Portal" />
          <div>
            <h2 className="max-w-md text-5xl font-bold leading-[1.02]">
              Every cover counts.
            </h2>
            <p className="mt-5 max-w-sm text-muted-foreground">
              Menus, live orders, compliance and payouts — one workspace, built around the
              rhythm of service.
            </p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-5 py-14">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <Logo size={30} subtitle="Partner Portal" />
          </div>

          <h1 className="mt-10 text-3xl font-bold lg:mt-0">
            {mode === "in" ? "Welcome back" : "Create your venue account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "in"
              ? "Sign in to your partner workspace."
              : "Ten minutes to onboarding, no setup fee."}
          </p>

          <form
            className="mt-9 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                Email address
              </label>
              <input
                id="email"
                type="email"
                placeholder="venue@example.com"
                className="w-full rounded-xl border border-input bg-surface px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-brand"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="pw" className="text-sm font-medium text-muted-foreground">
                Password
              </label>
              <div className="relative">
                <input
                  id="pw"
                  type={show ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-input bg-surface px-4 py-3 pr-16 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-brand"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-brand"
                >
                  {show ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="glow w-full rounded-xl bg-brand py-3.5 text-sm font-semibold text-brand-foreground transition-transform hover:scale-[1.01]"
            >
              {mode === "in" ? "Sign in to partner portal" : "Register account"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-muted-foreground">
            {mode === "in" ? "New venue?" : "Already a partner?"}{" "}
            <button
              onClick={() => setMode(mode === "in" ? "up" : "in")}
              className="font-semibold text-brand hover:underline"
            >
              {mode === "in" ? "Create an account" : "Sign in"}
            </button>
          </p>

          <Link
            to="/"
            className="mt-10 block text-center text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
          >
            ← Back to site
          </Link>
        </div>
      </div>
    </div>
  );
}
