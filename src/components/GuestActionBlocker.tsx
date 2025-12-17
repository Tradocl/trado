import { ReactNode, MouseEvent } from "react";
import { useGuest } from "@/contexts/GuestContext";

interface GuestActionBlockerProps {
  children: ReactNode;
  action?: string;
  className?: string;
}

export const GuestActionBlocker = ({ children, action = "continuar", className }: GuestActionBlockerProps) => {
  const { isGuestMode, promptRegistration } = useGuest();

  const handleClick = (e: MouseEvent) => {
    if (isGuestMode) {
      e.preventDefault();
      e.stopPropagation();
      promptRegistration(action);
    }
  };

  if (!isGuestMode) {
    return <>{children}</>;
  }

  return (
    <div onClick={handleClick} className={className}>
      {children}
    </div>
  );
};
