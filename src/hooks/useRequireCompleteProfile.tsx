import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface ProfileData {
  rut: string | null;
  phone: string | null;
  address: string | null;
  profile_completed: boolean | null;
}

export const useRequireCompleteProfile = () => {
  const { user } = useAuth();
  const [showCompleteProfileModal, setShowCompleteProfileModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkProfileComplete = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("rut, phone, address, profile_completed")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error checking profile:", error);
        return false;
      }

      const profile = data as ProfileData;
      
      // Profile is complete if all required fields are filled
      const isComplete = !!(
        profile?.rut && 
        profile?.phone && 
        profile?.address &&
        profile.rut.trim() !== '' &&
        profile.phone.trim() !== '' &&
        profile.address.trim() !== ''
      );

      return isComplete;
    } catch (error) {
      console.error("Error checking profile:", error);
      return false;
    }
  }, [user]);

  const requireCompleteProfile = useCallback(async (action: () => void): Promise<boolean> => {
    if (!user) return false;

    setIsChecking(true);
    const isComplete = await checkProfileComplete();
    setIsChecking(false);

    if (isComplete) {
      action();
      return true;
    } else {
      setPendingAction(() => action);
      setShowCompleteProfileModal(true);
      return false;
    }
  }, [user, checkProfileComplete]);

  const onProfileCompleted = useCallback(() => {
    setShowCompleteProfileModal(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  }, [pendingAction]);

  const closeModal = useCallback(() => {
    setShowCompleteProfileModal(false);
    setPendingAction(null);
  }, []);

  return {
    showCompleteProfileModal,
    setShowCompleteProfileModal,
    requireCompleteProfile,
    onProfileCompleted,
    closeModal,
    isChecking,
    checkProfileComplete
  };
};
