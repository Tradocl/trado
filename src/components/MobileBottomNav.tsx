import { memo, useCallback, useMemo } from "react";
import { useLocation, useNavigate, matchPath } from "react-router-dom";
import { Home, Wallet, Plus, User, Repeat, type LucideIcon } from "lucide-react";
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
  Icon: LucideIcon;
  primary?: boolean;
  match: string[];
};

// Frozen module-level constant — never re-allocated across renders
const items: readonly Item[] = Object.freeze([
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
]);

const isPublicPath = (pathname: string) =>
  pathname === "/" ||
  PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

const computeActiveIndex = (pathname: string): number => {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    for (const pattern of item.match) {
      if (matchPath({ path: pattern, end: pattern === item.to }, pathname)) {
        return i;
      }
    }
  }
  return -1;
};

// Static styles factored out so React can skip re-evaluating object literals
const NAV_STYLE: React.CSSProperties = {
  paddingBottom: "env(safe-area-inset-bottom, 0px)",
  paddingLeft: "env(safe-area-inset-left, 0px)",
  paddingRight: "env(safe-area-inset-right, 0px)",
};
const SPACER_STYLE: React.CSSProperties = {
  height: "calc(var(--bottom-nav-h, 4rem) + env(safe-area-inset-bottom, 0px))",
};
const LIST_STYLE: React.CSSProperties = { height: "var(--bottom-nav-h, 4rem)" };

type NavItemProps = {
  item: Item;
  active: boolean;
  onNavigate: (to: string) => void;
};

const NavItem = memo(({ item, active, onNavigate }: NavItemProps) => {
  const { to, label, ariaLabel, Icon, primary } = item;
  const handleClick = useCallback(() => onNavigate(to), [onNavigate, to]);

  if (primary) {
    return (
      <li className="flex items-center justify-center">
        <button
          type="button"
          onClick={handleClick}
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
    <li className="flex">
      <button
        type="button"
        onClick={handleClick}
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
});
NavItem.displayName = "NavItem";

const MobileBottomNavInner = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Memoized handler — stable reference across renders, so NavItem stays memoized
  const handleNavigate = useCallback(
    (to: string) => {
      navigate(to);
    },
    [navigate]
  );

  // Recalculated only when pathname changes (not on auth re-renders)
  const activeIndex = useMemo(() => computeActiveIndex(pathname), [pathname]);
  const isPublic = useMemo(() => isPublicPath(pathname), [pathname]);

  if (loading || !user || isPublic) return null;

  return (
    <>
      <div aria-hidden="true" className="md:hidden w-full" style={SPACER_STYLE} />
      <nav
        aria-label="Navegación principal"
        role="navigation"
        className={cn(
          "md:hidden fixed inset-x-0 bottom-0 z-40",
          "border-t border-border/60",
          "bg-background/85 supports-[backdrop-filter]:bg-background/70",
          "backdrop-blur-xl backdrop-saturate-150",
          "shadow-[0_-1px_0_0_hsl(var(--border)/0.6),0_-8px_24px_-12px_rgba(0,0,0,0.18)]"
        )}
        style={NAV_STYLE}
      >
        <ul className="grid grid-cols-5 max-w-md mx-auto px-1" style={LIST_STYLE}>
          {items.map((item, idx) => (
            <NavItem
              key={item.to}
              item={item}
              active={idx === activeIndex}
              onNavigate={handleNavigate}
            />
          ))}
        </ul>
      </nav>
    </>
  );
};

export const MobileBottomNav = memo(MobileBottomNavInner);
export default MobileBottomNav;
