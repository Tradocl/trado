import { supabase } from "@/integrations/supabase/client";

export { supabase };

export const signUp = async (
  email: string, 
  password: string, 
  fullName: string,
  phone: string,
  rut: string,
  address: string
) => {
  const redirectUrl = `${window.location.origin}/`;
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        full_name: fullName,
        phone,
        rut,
        address
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
    // Check if there's an active session first
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      // No active session, just return success
      return { error: null };
    }
    
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (error: any) {
    console.error("Error during signOut:", error);
    return { error };
  }
};
