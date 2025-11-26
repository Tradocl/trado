import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Users, TrendingUp, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-light to-info">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center text-white space-y-8 max-w-4xl mx-auto">
          <div className="flex justify-center mb-8">
            <div className="p-6 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl">
              <Shield className="h-20 w-20 text-white" />
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Trado
          </h1>
          
          <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
            Compra y vende con total seguridad. Tu dinero protegido hasta que confirmes la entrega.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-white text-primary hover:bg-white/90 shadow-2xl text-lg px-8 py-6 h-auto"
            >
              Comenzar Ahora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/auth")}
              className="border-2 border-white text-white hover:bg-white/10 text-lg px-8 py-6 h-auto"
            >
              Iniciar Sesión
              <Lock className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-white">
            <div className="p-4 bg-success/20 rounded-xl w-fit mb-4">
              <Shield className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold mb-3">100% Seguro</h3>
            <p className="text-white/80">
              Tu dinero queda retenido hasta que confirmes que recibiste lo que compraste. Sin riesgos.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-white">
            <div className="p-4 bg-info/20 rounded-xl w-fit mb-4">
              <Users className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Reputación</h3>
            <p className="text-white/80">
              Sistema de calificaciones para comprar y vender con confianza. Verifica a quién le compras.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-white">
            <div className="p-4 bg-warning/20 rounded-xl w-fit mb-4">
              <TrendingUp className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Simple y Rápido</h3>
            <p className="text-white/80">
              Crea una sala, comparte el código y listo. Vende sin complicaciones en minutos.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-12 border border-white/20 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            ¿Listo para transaccionar seguro?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Únete a miles de usuarios que ya confían en Trado
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="bg-white text-primary hover:bg-white/90 shadow-2xl text-lg px-12 py-6 h-auto"
          >
            Crear Cuenta Gratis
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
