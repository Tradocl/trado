import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, Store, Wallet, Star, LogOut, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface Profile {
  full_name: string;
  reputation_score: number;
  total_transactions: number;
}

interface WalletData {
  balance: number;
}

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      loadUserData();
    }
  }, [user, authLoading, navigate]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      const [profileRes, walletRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("wallets").select("*").eq("user_id", user.id).single(),
      ]);

      if (profileRes.error) throw profileRes.error;
      if (walletRes.error) throw walletRes.error;

      setProfile(profileRes.data);
      setWallet(walletRes.data);
    } catch (error: any) {
      toast.error("Error al cargar datos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
    } else {
      navigate("/auth");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-muted">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary rounded-lg">
              <ShoppingBag className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">Trado</h1>
          </div>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Salir
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Welcome Card */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-primary to-primary-light text-primary-foreground">
          <CardHeader>
            <CardTitle className="text-2xl">
              ¡Hola, {profile?.full_name || "Usuario"}!
            </CardTitle>
            <CardDescription className="text-primary-foreground/80">
              Bienvenido a tu panel de control seguro
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-6">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              <div>
                <p className="text-sm opacity-80">Saldo</p>
                <p className="text-2xl font-bold">${wallet?.balance || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              <div>
                <p className="text-sm opacity-80">Reputación</p>
                <p className="text-2xl font-bold">
                  {profile?.reputation_score?.toFixed(1) || "0.0"}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm opacity-80">Transacciones</p>
              <p className="text-2xl font-bold">{profile?.total_transactions || 0}</p>
            </div>
          </CardContent>
        </Card>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-xl transition-shadow cursor-pointer border-2 hover:border-primary"
                onClick={() => navigate("/create-sale")}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-success/10 rounded-xl">
                  <Store className="h-8 w-8 text-success" />
                </div>
                <div>
                  <CardTitle className="text-xl">Vender</CardTitle>
                  <CardDescription>Crea una transacción segura</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Crea una sala de transacción para vender tu producto de forma segura con escrow
              </p>
              <Button className="w-full bg-success hover:bg-success/90">
                <Plus className="mr-2 h-4 w-4" />
                Crear Venta
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-shadow cursor-pointer border-2 hover:border-info"
                onClick={() => navigate("/join-transaction")}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-info/10 rounded-xl">
                  <ShoppingBag className="h-8 w-8 text-info" />
                </div>
                <div>
                  <CardTitle className="text-xl">Comprar</CardTitle>
                  <CardDescription>Únete a una transacción</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Ingresa el código de invitación para unirte a una compra protegida
              </p>
              <Button className="w-full bg-info hover:bg-info/90">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Unirse a Compra
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Wallet Card */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-6 w-6 text-primary" />
              Mi Billetera
            </CardTitle>
            <CardDescription>Administra tu saldo virtual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
              <span className="text-sm font-medium">Saldo disponible</span>
              <span className="text-2xl font-bold">${wallet?.balance || 0}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" onClick={() => navigate("/wallet")}>
                Ver Movimientos
              </Button>
              <Button onClick={() => navigate("/wallet?action=deposit")}>
                <Plus className="mr-2 h-4 w-4" />
                Depositar
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
