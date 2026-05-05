
import { useLocation, useNavigate } from "react-router-dom";
import { Home, Wallet, Plus, User, Repeat } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const PUBLIC_PREFIXES = ["/", "/auth", "/terms", "/privacy", "/reset-password", "/verificar-email", "/invite"];

const items = [
  { to: "/dashboard", label: "Inicio", Icon: Home },
  { to: "/transaction-history", label: "Trans.", Icon: Repeat },
  { to: "/create-transaction", label: "Crear", Icon: Plus, primary: true },
  { to: "/wallet", label: "Billetera", Icon: Wallet },
  { to: "/profile", label: "Perfil", Icon: User },
];

export const MobileBottomNav = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (loading || !user) return null;

  // Hide on public/auth-only routes
  const isPublic =
    pathname === "/" ||
    PUBLIC_PREFIXES.some((p) => p !== "/" && (pathname === p || pathname.startsWith(p + "/")));
  if (isPublic) return null;

  const isActive = (to: string) =>
    to === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(to);

  return (
    <nav
      aria-label="Navegación principal"
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/85 backdrop-blur-xl shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.12)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5 h-16 max-w-md mx-auto">
        {items.map(({ to, label, Icon, primary }) => {
          const active = isActive(to);
          if (primary) {
            return (
              <li key={to} className="flex items-center justify-center">
                <button
                  onClick={() => navigate(to)}
                  aria-label={label}
                  className="-mt-6 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary-light text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Icon className="h-6 w-6" />
                </button>
              </li>
            );
          }
          return (
            <li key={to}>
              <button
                onClick={() => navigate(to)}
                className={cn(
                  "w-full h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "scale-110")} />
                <span>{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MobileBottomNav;
