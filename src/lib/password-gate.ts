import type { User } from "@supabase/supabase-js";

/**
 * Users who signed up via Google OAuth do not have a password.
 * We force them to create one on first login so they can also sign in
 * with email/password later.
 *
 * Detection: primary provider is google AND we haven't marked password_set
 * in user_metadata yet.
 */
export const userNeedsPassword = (user: User | null | undefined): boolean => {
  if (!user) return false;
  const provider = (user.app_metadata as any)?.provider;
  const providers: string[] = (user.app_metadata as any)?.providers || [];
  const isGoogleOnly =
    provider === "google" || (providers.length > 0 && providers.every((p) => p !== "email"));
  if (!isGoogleOnly) return false;
  const passwordSet = (user.user_metadata as any)?.password_set === true;
  return !passwordSet;
};
