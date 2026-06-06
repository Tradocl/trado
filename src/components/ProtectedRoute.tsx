import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { userNeedsPassword } from "@/lib/password-gate";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    // Save the attempted URL for redirect after login
    sessionStorage.setItem("redirectAfterLogin", location.pathname + location.search);
    return <Navigate to="/auth" replace />;
  }

  // Force Google-only users to create a password before accessing the app.
  if (userNeedsPassword(user) && location.pathname !== "/set-password") {
    sessionStorage.setItem("redirectAfterLogin", location.pathname + location.search);
    return <Navigate to="/set-password" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
