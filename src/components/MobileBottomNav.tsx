import { useLocation, useNavigate, matchPath } from "react-router-dom";
import { Home, Wallet, Plus, User, Repeat } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const PUBLIC_PREFIXES = [
  "/auth",
  "/terms",
  "/privacy",
  "/reset-password",
  "/verificar-email",
  "/invite",
];

type Item = {
  to: string;
  label: string;
  ariaLabel: string;
  Icon: typeof Home;
  primary?: boolean;
  match?: string[];
};

const items: Item[] = [
  { to: "/dashboard", label: "Inicio", ariaLabel: "Ir al inicio", Icon: Home, match: ["/dashboard"] },
  {
    to: "/transaction-history",
    label: "Trans.",
    ariaLabel: "Ver transacciones",
    Icon: Repeat,
    match: ["/transaction-history/*", "/transaction/*"],
  },
  {
    to: "/create-transaction",
    label: "Crear",
    ariaLabel: "Crear nueva transacción",
    Icon: Plus,
    primary: true,
    match: ["/create-transaction/*", "/join-transaction/*"],
  },
  {
    to: "/wallet",
    label: "Billetera",
    ariaLabel: "Ir a billetera",
    Icon: Wallet,
    match: ["/wallet/*", "/movement-history/*"],
  },
  {
    to: "/profile",
    label: "Perfil",
    ariaLabel: "Ir al perfil",
    Icon: User,
    match: ["/profile/*", "/verification/*"],
  },
];

const isItemActive = (pathname: string, item: Item) => {
  const patterns = item.match ?? [item.to];
  return patterns.some((p) => !!matchPath({ path: p, end: p === item.to }, pathname));
};

export const MobileBottomNav = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (loading || !user) return null;

  const isPublic =
    pathname === "/" ||
    PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isPublic) return null;

  const activeIndex = items.findIndex((it) => isItemActive(pathname, it));

  return (
    <>
      {/* Spacer: keeps content above the fixed nav across rotations and pages.
          Uses the same calc as the nav so it scales with the device safe area. */}
      <div
        aria-hidden="true"
        className="md:hidden w-full"
        style={{ height: "calc(var(--bottom-nav-h, 4rem) + env(safe-area-inset-bottom, 0px))" }}
      />
      <nav
        aria-label="Navegación principal"
        role="navigation"
        className={cn(
          "md:hidden fixed inset-x-0 bottom-0 z-40",
          "border-t border-border/60",
          // Cross-browser translucent surface: supports backdrop-filter on iOS Safari + Android Chrome
          "bg-background/85 supports-[backdrop-filter]:bg-background/70",
          "backdrop-blur-xl backdrop-saturate-150",
          // Soft top shadow that renders identically on iOS and Android (no blur edge cases)
          "shadow-[0_-1px_0_0_hsl(var(--border)/0.6),0_-8px_24px_-12px_rgba(0,0,0,0.18)]"
        )}
        style={{
          // Dynamic safe-area: nav height stays identical visually, only inner padding grows
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          paddingLeft: "env(safe-area-inset-left, 0px)",
          paddingRight: "env(safe-area-inset-right, 0px)",
        }}
      >
        <ul
          className="grid grid-cols-5 max-w-md mx-auto px-1"
          style={{ height: "var(--bottom-nav-h, 4rem)" }}
        >
          {items.map((item, idx) => {
            const { to, label, ariaLabel, Icon, primary } = item;
            const active = idx === activeIndex;

            if (primary) {
              return (
                <li key={to} className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => navigate(to)}
                    aria-label={ariaLabel}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "-mt-6 h-14 w-14 rounded-full",
                      "bg-gradient-to-br from-primary to-primary-light text-primary-foreground",
                      "shadow-[0_8px_20px_-8px_hsl(var(--primary)/0.5)] ring-4 ring-background",
                      "flex items-center justify-center",
                      "active:scale-95 transition-transform",
                      "focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    )}
                  >
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </li>
              );
            }

            return (
              <li key={to} className="flex">
                <button
                  type="button"
                  onClick={() => navigate(to)}
                  aria-label={ariaLabel}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative w-full h-full flex flex-col items-center justify-center gap-0.5",
                    "text-[11px] font-medium leading-none",
                    "transition-colors rounded-md",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                  )}
                >
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary"
                    />
                  )}
                  <Icon
                    className={cn("h-5 w-5 transition-transform", active && "scale-110")}
                    aria-hidden="true"
                  />
                  <span>{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
};

export default MobileBottomNav;
