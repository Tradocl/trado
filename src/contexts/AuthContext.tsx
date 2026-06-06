import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { setupPushNotifications, removePushListeners } from "@/lib/native/notifications";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
});

const welcomeEmailInvocations = new Set<string>();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const maybeSendWelcome = (s: Session | null) => {
      if (!s?.user) return;
      if (welcomeEmailInvocations.has(s.user.id)) return;
      welcomeEmailInvocations.add(s.user.id);
      // Fire-and-forget; edge function is idempotent (skips if already sent).
      setTimeout(async () => {
        const { error } = await supabase.functions.invoke("send-welcome-email", { body: {} });
        if (error) {
          welcomeEmailInvocations.delete(s.user.id);
          console.log("welcome email invoke failed", error);
        }
      }, 0);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          setupPushNotifications(session.user.id);
          if (event === "SIGNED_IN") maybeSendWelcome(session);
        } else {
          removePushListeners();
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        setupPushNotifications(session.user.id);
        // Do NOT send welcome here — onAuthStateChange fires SIGNED_IN for new sessions.
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
