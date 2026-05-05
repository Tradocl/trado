import { useLocation, useNavigate, matchPath } from "react-router-dom";
import { Home, Wallet, Plus, User, Repeat } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const PUBLIC_PREFIXES = ["/auth", "/terms", "/privacy", "/reset-password", "/verificar-email", "/invite"];

type Item = {
  to: string;
  label: string;
  Icon: typeof Home;
  primary?: boolean;
  // Routes that should also activate this item (nested or sibling)
  match?: string[];
};

const items: Item[] = [
  { to: "/dashboard", label: "Inicio", Icon: Home, match: ["/dashboard"] },
  {
    to: "/transaction-history",
    label: "Trans.",
    Icon: Repeat,
    match: ["/transaction-history/*", "/transaction/*"],
  },
  { to: "/create-transaction", label: "Crear", Icon: Plus, primary: true, match: ["/create-transaction/*", "/join-transaction/*"] },
  { to: "/wallet", label: "Billetera", Icon: Wallet, match: ["/wallet/*", "/movement-history/*"] },
  { to: "/profile", label: "Perfil", Icon: User, match: ["/profile/*", "/verification/*"] },
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

  // Hide on public/auth-only routes
  const isPublic =
    pathname === "/" ||
    PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isPublic) return null;

  return (
    <>
      {/* Spacer to guarantee content isn't hidden behind the fixed nav, regardless of :has() support */}
      <div
        aria-hidden="true"
        className="md:hidden"
        style={{ height: "calc(4rem + env(safe-area-inset-bottom))" }}
      />
      <nav
        aria-label="Navegación principal"
        className={cn(
          "md:hidden fixed inset-x-0 bottom-0 z-40",
          "border-t border-border/60 bg-background/90 backdrop-blur-xl",
          "shadow-[0_-6px_24px_-12px_rgba(0,0,0,0.18)]"
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-5 h-16 max-w-md mx-auto px-1">
          {items.map((item) => {
            const { to, label, Icon, primary } = item;
            const active = isItemActive(pathname, item);

            if (primary) {
              return (
                <li key={to} className="flex items-center justify-center">
                  <button
                    onClick={() => navigate(to)}
                    aria-label={label}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "-mt-6 h-14 w-14 rounded-full",
                      "bg-gradient-to-br from-primary to-primary-light text-primary-foreground",
                      "shadow-lg shadow-primary/30 ring-4 ring-background",
                      "flex items-center justify-center active:scale-95 transition-transform"
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </button>
                </li>
              );
            }

            return (
              <li key={to} className="flex">
                <button
                  onClick={() => navigate(to)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative w-full h-full flex flex-col items-center justify-center gap-0.5",
                    "text-[11px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary"
                    />
                  )}
                  <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} />
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
