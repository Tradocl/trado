import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-md space-y-6">
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <p className="text-xl text-muted-foreground">
          La página que buscas no existe o fue movida.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <Button onClick={() => navigate("/")}>
            <Home className="mr-2 h-4 w-4" />
            Inicio
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
