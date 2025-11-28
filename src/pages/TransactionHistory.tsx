import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShoppingBag, Store, Calendar, DollarSign, User, Package } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Transaction {
  id: string;
  product_name: string;
  product_description: string | null;
  amount: number;
  commission: number;
  state: string;
  created_at: string;
  completed_at: string | null;
  seller_id: string;
  buyer_id: string | null;
  seller_profile?: {
    full_name: string;
    reputation_score: number;
  };
  buyer_profile?: {
    full_name: string;
    reputation_score: number;
  };
}

export default function TransactionHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Transaction[]>([]);
  const [sales, setSales] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadTransactions();
  }, [user, navigate]);

  const loadTransactions = async () => {
    try {
      // Load completed purchases
      const { data: purchaseData, error: purchaseError } = await supabase
        .from("transactions")
        .select(`
          *,
          seller_profile:profiles!transactions_seller_id_fkey(full_name, reputation_score)
        `)
        .eq("buyer_id", user!.id)
        .eq("state", "completed")
        .order("completed_at", { ascending: false });

      if (purchaseError) throw purchaseError;

      // Load completed sales
      const { data: salesData, error: salesError } = await supabase
        .from("transactions")
        .select(`
          *,
          buyer_profile:profiles!transactions_buyer_id_fkey(full_name, reputation_score)
        `)
        .eq("seller_id", user!.id)
        .eq("state", "completed")
        .order("completed_at", { ascending: false });

      if (salesError) throw salesError;

      setPurchases(purchaseData || []);
      setSales(salesData || []);
    } catch (error: any) {
      console.error("Error loading transactions:", error);
      toast.error("Error al cargar el historial de transacciones");
    } finally {
      setLoading(false);
    }
  };

  const TransactionCard = ({ transaction, isSale }: { transaction: Transaction; isSale: boolean }) => {
    const otherParty = isSale ? transaction.buyer_profile : transaction.seller_profile;
    const netAmount = isSale ? Number(transaction.amount) - Number(transaction.commission) : Number(transaction.amount);

    return (
      <Card 
        className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary/30"
        onClick={() => navigate(`/transaction/${transaction.id}`)}
      >
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg">{transaction.product_name}</h3>
              </div>
              {transaction.product_description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {transaction.product_description}
                </p>
              )}
            </div>
            <Badge variant="default" className="ml-4">
              <DollarSign className="h-3 w-3 mr-1" />
              ${netAmount.toLocaleString("es-CL")}
            </Badge>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="font-medium">
                {isSale ? "Comprador:" : "Vendedor:"}
              </span>
              <span>{otherParty?.full_name || "Usuario"}</span>
              {otherParty && (
                <span className="ml-2 text-warning">
                  ⭐ {otherParty.reputation_score?.toFixed(1) || "0.0"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Completada el:</span>
              <span className="font-medium">
                {transaction.completed_at
                  ? format(new Date(transaction.completed_at), "dd/MM/yyyy HH:mm", { locale: es })
                  : "-"}
              </span>
            </div>

            {isSale && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                <span>Comisión: ${Number(transaction.commission).toLocaleString("es-CL")}</span>
                <span>•</span>
                <span>Recibido: ${netAmount.toLocaleString("es-CL")}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver al Dashboard
      </Button>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Historial de Transacciones</h1>
        <p className="text-muted-foreground">
          Todas tus compras y ventas completadas
        </p>
      </div>

      <Tabs defaultValue="purchases" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="purchases" className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Compras ({purchases.length})
          </TabsTrigger>
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Ventas ({sales.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="purchases" className="space-y-4">
          {purchases.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">No hay compras completadas</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  Cuando completes tu primera compra, aparecerá aquí
                </p>
                <Button onClick={() => navigate("/join-transaction")}>
                  Explorar Productos
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {purchases.map((transaction) => (
                <TransactionCard 
                  key={transaction.id} 
                  transaction={transaction} 
                  isSale={false} 
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          {sales.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Store className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">No hay ventas completadas</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  Cuando completes tu primera venta, aparecerá aquí
                </p>
                <Button onClick={() => navigate("/create-sale")}>
                  Crear Venta
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {sales.map((transaction) => (
                <TransactionCard 
                  key={transaction.id} 
                  transaction={transaction} 
                  isSale={true} 
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
