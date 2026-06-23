import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";

export { supabase };

export const signUp = async (
  email: string,
  password: string,
  fullName: string
) => {
  const redirectUrl = Capacitor.isNativePlatform()
    ? "trado://verificar-email"
    : `${window.location.origin}/verificar-email`;
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        full_name: fullName
      }
    }
  });
  
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  return { data, error };
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    return { error };
  } catch (error: any) {
    console.error("Error during signOut:", error);
    return { error };
  }
};
