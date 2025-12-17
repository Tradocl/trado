import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface GuestContextType {
  isGuestMode: boolean;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
  promptRegistration: (action?: string) => void;
  registrationPromptOpen: boolean;
  setRegistrationPromptOpen: (open: boolean) => void;
  currentAction: string;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

export const useGuest = () => {
  const context = useContext(GuestContext);
  if (!context) {
    throw new Error("useGuest must be used within GuestProvider");
  }
  return context;
};

export const GuestProvider = ({ children }: { children: ReactNode }) => {
  const [isGuestMode, setIsGuestMode] = useState(() => {
    return sessionStorage.getItem("guestMode") === "true";
  });
  const [registrationPromptOpen, setRegistrationPromptOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState("");

  const enterGuestMode = useCallback(() => {
    sessionStorage.setItem("guestMode", "true");
    setIsGuestMode(true);
  }, []);

  const exitGuestMode = useCallback(() => {
    sessionStorage.removeItem("guestMode");
    setIsGuestMode(false);
  }, []);

  const promptRegistration = useCallback((action?: string) => {
    setCurrentAction(action || "continuar");
    setRegistrationPromptOpen(true);
  }, []);

  return (
    <GuestContext.Provider
      value={{
        isGuestMode,
        enterGuestMode,
        exitGuestMode,
        promptRegistration,
        registrationPromptOpen,
        setRegistrationPromptOpen,
        currentAction,
      }}
    >
      {children}
    </GuestContext.Provider>
  );
};
