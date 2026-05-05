import { useNavigate, useLocation } from "react-router-dom";
import { Home, Wallet, User, Plus, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { icon: Home, label: "Inicio", path: "/dashboard" },
  { icon: Clock, label: "Historial", path: "/transaction-history" },
  { icon: Wallet, label: "Wallet", path: "/wallet" },
  { icon: User, label: "Perfil", path: "/profile" },
];

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Spacer so page content isn't hidden behind the nav */}
      <div className="h-24" />

      <div className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-center pb-safe">
        <div className="w-full max-w-lg mx-4 mb-3">
          <div className="relative flex items-center justify-around bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl px-2 py-2 shadow-2xl shadow-black/20">

            {tabs.slice(0, 2).map((tab) => (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all duration-200 min-w-[60px]",
                  isActive(tab.path)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-xl transition-all duration-200",
                  isActive(tab.path) && "bg-primary/10"
                )}>
                  <tab.icon className="h-5 w-5" strokeWidth={isActive(tab.path) ? 2.5 : 1.8} />
                </div>
                <span className={cn(
                  "text-[10px] font-medium",
                  isActive(tab.path) ? "text-primary" : "text-muted-foreground"
                )}>
                  {tab.label}
                </span>
              </button>
            ))}

            {/* FAB central */}
            <div className="relative -mt-6">
              <button
                onClick={() => navigate("/create-transaction")}
                className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-[#7147d4] shadow-lg shadow-primary/40 transition-all duration-200 active:scale-95 hover:shadow-primary/50 hover:shadow-xl"
              >
                <Plus className="h-6 w-6 text-white" strokeWidth={2.5} />
              </button>
              <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                Nueva
              </span>
            </div>

            {tabs.slice(2).map((tab) => (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all duration-200 min-w-[60px]",
                  isActive(tab.path)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-xl transition-all duration-200",
                  isActive(tab.path) && "bg-primary/10"
                )}>
                  <tab.icon className="h-5 w-5" strokeWidth={isActive(tab.path) ? 2.5 : 1.8} />
                </div>
                <span className={cn(
                  "text-[10px] font-medium",
                  isActive(tab.path) ? "text-primary" : "text-muted-foreground"
                )}>
                  {tab.label}
                </span>
              </button>
            ))}

          </div>
        </div>
      </div>
    </>
  );
};
