import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, XCircle, Users, Wallet, Shield, TrendingUp, ShoppingBag, Scale, Coins, ArrowDownCircle, ArrowUpCircle, Lock, Receipt, AlertTriangle, CheckCircle2, RotateCcw, Building, BadgeDollarSign, Copy, Clock, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatCLP } from "@/lib/utils";
import { AdminAppealsList } from "@/components/admin/AdminAppealsList";
import { AdminReturnMediationList } from "@/components/admin/AdminReturnMediationList";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  rut: string | null;
  is_verified: boolean;
  verification_status: string;
  total_transactions: number;
  reputation_score: number;
}

interface WalletMovement {
  id: string;
  wallet_id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
  reviewed_at: string | null;
  status: string;
  user_name?: string;
  user_email?: string;
  bank_holder_name?: string;
  bank_holder_rut?: string;
  bank_name?: string;
  bank_account_type?: string;
  bank_account_number?: string;
}

interface VerificationRequest {
  id: string;
  full_name: string;
  email: string;
  verification_status: string;
  verification_document_url: string | null;
  verification_selfie_url: string | null;
  verification_submitted_at: string | null;
}

interface Transaction {
  id: string;
  product_name: string;
  amount: number;
  state: string;
  seller_id: string;
  buyer_id: string | null;
  created_at: string;
  completed_at: string | null;
  seller?: { full_name: string; email: string };
  buyer?: { full_name: string; email: string };
}

const stateLabels: Record<string, { label: string; color: string }> = {
  created: { label: "Creada", color: "secondary" },
  invited: { label: "Invitado", color: "default" },
  awaiting_deposit: { label: "Esperando depósito", color: "secondary" },
  funds_secured: { label: "Fondos asegurados", color: "default" },
  in_delivery: { label: "En entrega", color: "default" },
  completed: { label: "Completada", color: "default" },
  cancelled: { label: "Cancelada", color: "destructive" },
  in_dispute: { label: "En disputa", color: "destructive" },
};

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminRole();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<WalletMovement[]>([]);
  const [approvedDeposits, setApprovedDeposits] = useState<WalletMovement[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<WalletMovement[]>([]);
  const [approvedWithdrawals, setApprovedWithdrawals] = useState<WalletMovement[]>([]);
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedVerificationId, setSelectedVerificationId] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmWithdrawalId, setConfirmWithdrawalId] = useState<string | null>(null);
  const [depositSearch, setDepositSearch] = useState("");
  const [withdrawalSearch, setWithdrawalSearch] = useState("");
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingVerifications: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    totalTransactions: 0,
    pendingAppeals: 0,
    pendingReturns: 0,
  });

  // Token accounting stats
  const [tokenStats, setTokenStats] = useState({
    totalCirculating: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    activeEscrow: 0,
    totalCommissions: 0,
    expectedBankBalance: 0, // Depósitos - Retiros (lo que debe haber en cuenta Trado)
    theoreticalWalletBalance: 0, // Depósitos - Retiros - Comisiones (lo que debería haber en wallets)
    discrepancy: 0,
    movementsByType: [] as { type: string; count: number; total: number }[],
    walletDetails: [] as { user_name: string; user_email: string; balance: number }[],
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast.error("No tienes permisos de administrador");
      navigate("/");
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (isAdmin && user) {
      loadAdminData();
    }
  }, [isAdmin, user]);

  const loadAdminData = async () => {
    try {
      setLoading(true);

      // Load all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      // Load pending deposits
      const { data: pendingDepositsData, error: pendingDepositsError } = await supabase
        .from("wallet_movements")
        .select("*")
        .eq("status", "pending")
        .eq("type", "deposit")
        .order("created_at", { ascending: false });

      if (pendingDepositsError) throw pendingDepositsError;

      // Load approved deposits (last 20)
      const { data: approvedDepositsData, error: approvedDepositsError } = await supabase
        .from("wallet_movements")
        .select("*")
        .eq("status", "approved")
        .eq("type", "deposit")
        .order("reviewed_at", { ascending: false })
        .limit(20);

      if (approvedDepositsError) throw approvedDepositsError;

      // Load pending withdrawals
      const { data: pendingWithdrawalsData, error: pendingWithdrawalsError } = await supabase
        .from("wallet_movements")
        .select("*")
        .eq("status", "pending")
        .eq("type", "withdrawal")
        .order("created_at", { ascending: false });

      if (pendingWithdrawalsError) throw pendingWithdrawalsError;

      // Load approved withdrawals (last 20)
      const { data: approvedWithdrawalsData, error: approvedWithdrawalsError } = await supabase
        .from("wallet_movements")
        .select("*")
        .eq("status", "approved")
        .eq("type", "withdrawal")
        .order("reviewed_at", { ascending: false })
        .limit(20);

      if (approvedWithdrawalsError) throw approvedWithdrawalsError;

      // Enrich all movements with user data
      const enrichMovements = async (movements: any[]) => {
        return await Promise.all(
          (movements || []).map(async (movement) => {
            const { data: wallet } = await supabase
              .from("wallets")
              .select("user_id, profiles!wallets_user_id_fkey(full_name, email)")
              .eq("id", movement.wallet_id)
              .single();
            
            return {
              ...movement,
              user_name: wallet?.profiles?.full_name || "Usuario",
              user_email: wallet?.profiles?.email || "",
            };
          })
        );
      };

      const enrichedPendingDeposits = await enrichMovements(pendingDepositsData);
      const enrichedApprovedDeposits = await enrichMovements(approvedDepositsData);
      const enrichedPendingWithdrawals = await enrichMovements(pendingWithdrawalsData);
      const enrichedApprovedWithdrawals = await enrichMovements(approvedWithdrawalsData);

      setPendingDeposits(enrichedPendingDeposits);
      setApprovedDeposits(enrichedApprovedDeposits);
      setPendingWithdrawals(enrichedPendingWithdrawals);
      setApprovedWithdrawals(enrichedApprovedWithdrawals);

      // Load pending verifications - only show users who have submitted documents (in_review)
      const { data: verificationsData, error: verificationsError } = await supabase
        .from("profiles")
        .select("id, full_name, email, verification_status, verification_document_url, verification_selfie_url, verification_submitted_at")
        .eq("verification_status", "in_review")
        .order("verification_submitted_at", { ascending: false });

      if (verificationsError) throw verificationsError;
      setVerifications(verificationsData || []);

      // Load all transactions with seller and buyer info
      const { data: transactionsData, error: transactionsError } = await supabase
        .from("transactions")
        .select(`
          *,
          seller:profiles!transactions_seller_id_fkey(full_name, email),
          buyer:profiles!transactions_buyer_id_fkey(full_name, email)
        `)
        .order("created_at", { ascending: false });

      if (transactionsError) throw transactionsError;
      setTransactions(transactionsData || []);

      // Load pending appeals count
      const { data: pendingAppealsData } = await supabase
        .from("appeals")
        .select("id")
        .in("status", ["pendiente_intervencion_plataforma", "en_revision_plataforma"]);

      // Load pending returns count (disputed returns need admin mediation)
      const { data: pendingReturnsData } = await supabase
        .from("return_requests")
        .select("id")
        .eq("status", "disputed");

      setStats({
        totalUsers: profilesData?.length || 0,
        pendingVerifications: verificationsData?.length || 0,
        pendingDeposits: pendingDepositsData?.length || 0,
        pendingWithdrawals: pendingWithdrawalsData?.length || 0,
        totalTransactions: transactionsData?.length || 0,
        pendingAppeals: pendingAppealsData?.length || 0,
        pendingReturns: pendingReturnsData?.length || 0,
      });

      // Load token accounting stats
      await loadTokenStats();
    } catch (error) {
      console.error("Error loading admin data:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  const loadTokenStats = async () => {
    try {
      // 1. Total circulating (sum of all wallet balances + blocked_balance)
      const { data: walletsData } = await supabase
        .from("wallets")
        .select("balance, blocked_balance, user_id, profiles!wallets_user_id_fkey(full_name, email)");

      const totalCirculating = walletsData?.reduce((sum, w) => sum + (w.balance || 0) + (w.blocked_balance || 0), 0) || 0;

      const walletDetails = walletsData?.map(w => ({
        user_name: w.profiles?.full_name || "Usuario",
        user_email: w.profiles?.email || "",
        balance: w.balance || 0,
        blocked_balance: w.blocked_balance || 0,
      })).sort((a, b) => b.balance - a.balance) || [];

      // 2. Total deposits approved
      const { data: depositsData } = await supabase
        .from("wallet_movements")
        .select("amount")
        .eq("type", "deposit")
        .eq("status", "approved");

      const totalDeposits = depositsData?.reduce((sum, d) => sum + d.amount, 0) || 0;

      // 3. Total withdrawals approved
      const { data: withdrawalsData } = await supabase
        .from("wallet_movements")
        .select("amount")
        .eq("type", "withdrawal")
        .eq("status", "approved");

      const totalWithdrawals = withdrawalsData?.reduce((sum, w) => sum + w.amount, 0) || 0;

      // 4. Active escrow - only count escrow_lock with status 'pending' 
      // When transaction completes, escrow_lock changes to 'approved', so it's no longer active
      const { data: escrowLockData } = await supabase
        .from("wallet_movements")
        .select("amount")
        .eq("type", "escrow_lock")
        .eq("status", "pending");

      // escrow_lock amounts are stored as negative, so we use Math.abs
      const activeEscrow = escrowLockData?.reduce((sum, e) => sum + Math.abs(e.amount), 0) || 0;

      // 5. Total commissions from completed transactions
      const { data: commissionsData } = await supabase
        .from("transactions")
        .select("commission")
        .eq("state", "completed");

      const totalCommissions = commissionsData?.reduce((sum, t) => sum + (t.commission || 0), 0) || 0;

      // 6. Movements by type
      const { data: allMovements } = await supabase
        .from("wallet_movements")
        .select("type, amount, status")
        .eq("status", "approved");

      const movementsByTypeMap: Record<string, { count: number; total: number }> = {};
      allMovements?.forEach(m => {
        if (!movementsByTypeMap[m.type]) {
          movementsByTypeMap[m.type] = { count: 0, total: 0 };
        }
        movementsByTypeMap[m.type].count++;
        movementsByTypeMap[m.type].total += m.amount;
      });

      const movementsByType = Object.entries(movementsByTypeMap).map(([type, data]) => ({
        type,
        count: data.count,
        total: data.total,
      }));

      // Calculate balances
      // expectedBankBalance = Depósitos - Retiros (lo que Trado debe tener en su cuenta bancaria)
      const expectedBankBalance = totalDeposits - totalWithdrawals;
      
      // theoreticalWalletBalance = Depósitos - Retiros - Comisiones (lo que debería estar en wallets de usuarios)
      const theoreticalWalletBalance = totalDeposits - totalWithdrawals - totalCommissions;
      
      // discrepancy = diferencia entre lo teórico y lo real en wallets
      const discrepancy = theoreticalWalletBalance - totalCirculating;

      setTokenStats({
        totalCirculating,
        totalDeposits,
        totalWithdrawals,
        activeEscrow,
        totalCommissions,
        expectedBankBalance,
        theoreticalWalletBalance,
        discrepancy,
        movementsByType,
        walletDetails,
      });
    } catch (error) {
      console.error("Error loading token stats:", error);
    }
  };

  const handleApproveMovement = async (movementId: string) => {
    if (processingId) return;
    setProcessingId(movementId);
    try {
      // Get the movement details first
      const { data: movement, error: fetchError } = await supabase
        .from("wallet_movements")
        .select("*, wallets!inner(*, profiles(*))")
        .eq("id", movementId)
        .single();

      if (fetchError || !movement) throw fetchError || new Error("Movimiento no encontrado");
      
      if (!movement.wallets) throw new Error("Wallet no encontrado");

      // Get current wallet balance directly to ensure we have the latest value
      const { data: currentWallet, error: walletFetchError } = await supabase
        .from("wallets")
        .select("balance")
        .eq("id", movement.wallet_id)
        .single();

      if (walletFetchError || !currentWallet) throw walletFetchError || new Error("No se pudo obtener el wallet");

      // Calculate new balance
      const currentBalance = currentWallet.balance || 0;
      const newBalance = movement.type === "deposit" 
        ? currentBalance + movement.amount 
        : currentBalance - movement.amount;

      console.log(`Aprobando movimiento: ${movement.type}, cantidad: ${movement.amount}, balance actual: ${currentBalance}, nuevo balance: ${newBalance}`);

      // Update wallet balance
      const { error: walletError } = await supabase
        .from("wallets")
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq("id", movement.wallet_id);

      if (walletError) throw walletError;

      // Build improved description
      const formattedAmount = movement.amount.toLocaleString('es-CL');
      const approvedDate = new Date().toLocaleDateString('es-CL');
      let updatedDescription = movement.description;
      
      if (movement.type === "deposit") {
        updatedDescription = `Depósito de $${formattedAmount} - Aprobado ${approvedDate}`;
      } else if (movement.type === "withdrawal") {
        const bankInfo = movement.bank_name ? ` a ${movement.bank_name}` : '';
        updatedDescription = `Retiro de $${formattedAmount}${bankInfo} - Aprobado ${approvedDate}`;
      }

      // Update movement status with improved description
      const { error: movementError } = await supabase
        .from("wallet_movements")
        .update({
          status: "approved",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          balance_after: newBalance,
          description: updatedDescription,
        })
        .eq("id", movementId);

      if (movementError) throw movementError;

      // Send email notification
      try {
        await supabase.functions.invoke("send-movement-notification", {
          body: {
            userEmail: movement.wallets.profiles.email,
            userName: movement.wallets.profiles.full_name,
            movementType: movement.type,
            amount: movement.amount,
            status: "approved",
            description: updatedDescription,
          },
        });
        // Push notification
        const isDeposit = movement.type === "deposit";
        supabase.functions.invoke("send-push-notification", {
          body: {
            userIds: [movement.wallets.user_id],
            title: isDeposit ? "¡Depósito acreditado!" : "Retiro procesado",
            body: `${isDeposit ? "💰" : "💸"} $${movement.amount.toLocaleString("es-CL")} CLP ${isDeposit ? "en tu billetera" : "transferidos a tu cuenta"}`,
            url: "/wallet",
            tag: `movement-${movementId}`,
          },
        }).catch(() => {});
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }

      toast.success(`${movement.type === "deposit" ? "Depósito" : "Retiro"} aprobado exitosamente`);
      loadAdminData();
    } catch (error) {
      console.error("Error approving movement:", error);
      toast.error("Error al aprobar el movimiento");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectMovement = async (movementId: string) => {
    if (processingId) return;
    setProcessingId(movementId);
    try {
      // Get movement details for email
      const { data: movement } = await supabase
        .from("wallet_movements")
        .select("*, wallets(*, profiles(*))")
        .eq("id", movementId)
        .single();

      const { error } = await supabase
        .from("wallet_movements")
        .update({
          status: "rejected",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", movementId);

      if (error) throw error;

      // Send email notification
      if (movement) {
        try {
          await supabase.functions.invoke("send-movement-notification", {
            body: {
              userEmail: movement.wallets.profiles.email,
              userName: movement.wallets.profiles.full_name,
              movementType: movement.type,
              amount: movement.amount,
              status: "rejected",
              description: movement.description,
            },
          });
        } catch (emailError) {
          console.error("Error sending email:", emailError);
        }
      }

      toast.success("Movimiento rechazado");
      loadAdminData();
    } catch (error) {
      console.error("Error rejecting movement:", error);
      toast.error("Error al rechazar el movimiento");
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveVerification = async (profileId: string) => {
    if (processingId) return;
    setProcessingId(profileId);
    try {
      // Get user data first for notification
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", profileId)
        .single();

      const { error } = await supabase
        .from("profiles")
        .update({
          verification_status: "approved",
          is_verified: true,
        })
        .eq("id", profileId);

      if (error) throw error;

      // Send email notification
      if (profile) {
        try {
          await supabase.functions.invoke("send-verification-result", {
            body: {
              userEmail: profile.email,
              userName: profile.full_name,
              status: "approved",
            },
          });
        } catch (emailError) {
          console.error("Error sending email:", emailError);
          // Don't fail the approval if email fails
        }
      }

      toast.success("Verificación aprobada");
      loadAdminData();
    } catch (error) {
      console.error("Error approving verification:", error);
      toast.error("Error al aprobar la verificación");
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectDialog = (profileId: string) => {
    setSelectedVerificationId(profileId);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleRejectVerification = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Por favor escribe un motivo de rechazo");
      return;
    }
    if (processingId) return;
    setProcessingId(selectedVerificationId);

    try {
      // Get user data first for notification
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", selectedVerificationId)
        .single();

      const { error } = await supabase
        .from("profiles")
        .update({
          verification_status: "rejected",
          is_verified: false,
          verification_rejection_reason: rejectionReason.trim(),
        })
        .eq("id", selectedVerificationId);

      if (error) throw error;

      // Send email notification
      if (profile) {
        try {
          await supabase.functions.invoke("send-verification-result", {
            body: {
              userEmail: profile.email,
              userName: profile.full_name,
              status: "rejected",
              rejectionReason: rejectionReason.trim(),
            },
          });
        } catch (emailError) {
          console.error("Error sending email:", emailError);
          // Don't fail the rejection if email fails
        }
      }

      toast.success("Verificación rechazada con motivo enviado al usuario");
      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedVerificationId("");
      loadAdminData();
    } catch (error) {
      console.error("Error rejecting verification:", error);
      toast.error("Error al rechazar la verificación");
    } finally {
      setProcessingId(null);
    }
  };

  if (authLoading || roleLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 24) return `hace ${h}h`;
    const d = Math.floor(h / 24);
    return `hace ${d}d`;
  };

  const pendingWithdrawal = confirmWithdrawalId
    ? pendingWithdrawals.find(w => w.id === confirmWithdrawalId)
    : null;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Panel de Administración</h1>
            <p className="text-muted-foreground">Gestiona usuarios, verificaciones y transacciones</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verificaciones Pendientes</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingVerifications}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Depósitos Pendientes</CardTitle>
            <Wallet className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingDeposits}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retiros Pendientes</CardTitle>
            <Wallet className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingWithdrawals}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transacciones</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="deposits" className="space-y-4">
        <TabsList>
          <TabsTrigger value="deposits">
            Depósitos
            {stats.pendingDeposits > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.pendingDeposits}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="withdrawals">
            Retiros
            {stats.pendingWithdrawals > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.pendingWithdrawals}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="transactions">
            Salas de Venta
          </TabsTrigger>
          <TabsTrigger value="verifications">
            Verificaciones
            {stats.pendingVerifications > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.pendingVerifications}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="appeals">
            <Scale className="h-4 w-4 mr-2" />
            Apelaciones
            {stats.pendingAppeals > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.pendingAppeals}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="returns">
            <RotateCcw className="h-4 w-4 mr-2" />
            Devoluciones
            {stats.pendingReturns > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.pendingReturns}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tokens">
            <Coins className="h-4 w-4 mr-2" />
            Tokens
          </TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Todos los Usuarios</CardTitle>
              <CardDescription>Lista completa de usuarios registrados</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>RUT</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Verificado</TableHead>
                    <TableHead>Transacciones</TableHead>
                    <TableHead>Reputación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">{profile.full_name}</TableCell>
                      <TableCell>{profile.email}</TableCell>
                      <TableCell>{profile.rut || "-"}</TableCell>
                      <TableCell>{profile.phone || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={profile.is_verified ? "default" : "secondary"}>
                          {profile.is_verified ? "Verificado" : "No verificado"}
                        </Badge>
                      </TableCell>
                      <TableCell>{profile.total_transactions || 0}</TableCell>
                      <TableCell>{profile.reputation_score?.toFixed(1) || "0.0"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Verificaciones Pendientes</CardTitle>
              <CardDescription>Revisa y aprueba verificaciones de identidad</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Envío</TableHead>
                    <TableHead>Documentos</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {verifications.map((verification) => (
                    <TableRow key={verification.id}>
                      <TableCell className="font-medium">{verification.full_name}</TableCell>
                      <TableCell>{verification.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{verification.verification_status}</Badge>
                      </TableCell>
                      <TableCell>
                        {verification.verification_submitted_at
                          ? new Date(verification.verification_submitted_at).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {verification.verification_document_url && (
                            <Button
                              variant="link"
                              size="sm"
                              onClick={async () => {
                                const path = verification.verification_document_url!.split('/verification-documents/')[1];
                                if (path) {
                                  const { data } = await supabase.storage
                                    .from('verification-documents')
                                    .createSignedUrl(path, 3600);
                                  if (data?.signedUrl) {
                                    window.open(data.signedUrl, "_blank");
                                  } else {
                                    toast.error("Error al abrir el documento");
                                  }
                                }
                              }}
                            >
                              Ver Carnet
                            </Button>
                          )}
                          {verification.verification_selfie_url && (
                            <Button
                              variant="link"
                              size="sm"
                              onClick={async () => {
                                const path = verification.verification_selfie_url!.split('/verification-documents/')[1];
                                if (path) {
                                  const { data } = await supabase.storage
                                    .from('verification-documents')
                                    .createSignedUrl(path, 3600);
                                  if (data?.signedUrl) {
                                    window.open(data.signedUrl, "_blank");
                                  } else {
                                    toast.error("Error al abrir la selfie");
                                  }
                                }
                              }}
                            >
                              Ver Selfie
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            disabled={processingId === verification.id}
                            onClick={() => handleApproveVerification(verification.id)}
                          >
                            {processingId === verification.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-1" />
                            )}
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={!!processingId}
                            onClick={() => openRejectDialog(verification.id)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rechazar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {verifications.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No hay verificaciones pendientes
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deposits" className="space-y-4">
          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList>
              <TabsTrigger value="pending">
                Por Aprobar
                {stats.pendingDeposits > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {stats.pendingDeposits}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved">Aprobados</TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <Card>
                <CardHeader>
                  <CardTitle>Depósitos Pendientes de Aprobación</CardTitle>
                  <CardDescription>Revisa y aprueba solicitudes de depósito</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre o email..."
                      value={depositSearch}
                      onChange={e => setDepositSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Fecha Solicitud</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingDeposits.filter(d =>
                        !depositSearch ||
                        d.user_name?.toLowerCase().includes(depositSearch.toLowerCase()) ||
                        d.user_email?.toLowerCase().includes(depositSearch.toLowerCase())
                      ).map((deposit) => (
                        <TableRow key={deposit.id}>
                          <TableCell className="font-medium">{deposit.user_name}</TableCell>
                          <TableCell>{deposit.user_email}</TableCell>
                          <TableCell className="font-bold text-success">
                            +${formatCLP(deposit.amount)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{timeAgo(deposit.created_at)}</span>
                            </div>
                            <p className="text-xs mt-0.5">
                              {new Date(deposit.created_at).toLocaleDateString("es-CL", {
                                day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                              })}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                disabled={processingId === deposit.id}
                                onClick={() => handleApproveMovement(deposit.id)}
                              >
                                {processingId === deposit.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1" />
                                ) : (
                                  <CheckCircle className="mr-1 h-4 w-4" />
                                )}
                                Aprobar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={processingId === deposit.id}
                                onClick={() => handleRejectMovement(deposit.id)}
                              >
                                {processingId === deposit.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1" />
                                ) : (
                                  <XCircle className="mr-1 h-4 w-4" />
                                )}
                                Rechazar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {pendingDeposits.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No hay depósitos pendientes
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="approved">
              <Card>
                <CardHeader>
                  <CardTitle>Depósitos Aprobados</CardTitle>
                  <CardDescription>Últimos 20 depósitos aprobados</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Fecha Aprobación</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedDeposits.map((deposit) => (
                        <TableRow key={deposit.id}>
                          <TableCell className="font-medium">{deposit.user_name}</TableCell>
                          <TableCell>{deposit.user_email}</TableCell>
                          <TableCell className="font-bold text-success">
                            +${formatCLP(deposit.amount)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(deposit.reviewed_at || deposit.created_at).toLocaleDateString("es-CL", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                      {approvedDeposits.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            No hay depósitos aprobados
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-4">
          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList>
              <TabsTrigger value="pending">
                Por Aprobar
                {stats.pendingWithdrawals > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {stats.pendingWithdrawals}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved">Aprobados</TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <Card>
                <CardHeader>
                  <CardTitle>Retiros Pendientes de Aprobación</CardTitle>
                  <CardDescription>Revisa datos bancarios y aprueba retiros</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre o email..."
                      value={withdrawalSearch}
                      onChange={e => setWithdrawalSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Datos Bancarios</TableHead>
                        <TableHead>Fecha Solicitud</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingWithdrawals.filter(w =>
                        !withdrawalSearch ||
                        w.user_name?.toLowerCase().includes(withdrawalSearch.toLowerCase()) ||
                        w.user_email?.toLowerCase().includes(withdrawalSearch.toLowerCase())
                      ).map((withdrawal) => (
                        <TableRow key={withdrawal.id}>
                          <TableCell className="font-medium">{withdrawal.user_name}</TableCell>
                          <TableCell className="text-sm">{withdrawal.user_email}</TableCell>
                          <TableCell>
                            <span className={`font-bold ${withdrawal.amount >= 100000 ? "text-destructive" : "text-warning"}`}>
                              -${formatCLP(withdrawal.amount)}
                            </span>
                            {withdrawal.amount >= 100000 && (
                              <Badge variant="destructive" className="ml-1 text-xs">Alto</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs space-y-1.5">
                              <p className="font-medium">{withdrawal.bank_holder_name}</p>
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">RUT:</span>
                                <span>{withdrawal.bank_holder_rut}</span>
                                <button onClick={() => copyToClipboard(withdrawal.bank_holder_rut || "", "RUT")} className="text-muted-foreground hover:text-foreground">
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                              <p className="text-muted-foreground">{withdrawal.bank_name} · {withdrawal.bank_account_type}</p>
                              <div className="flex items-center gap-1">
                                <span className="font-mono">{withdrawal.bank_account_number}</span>
                                <button onClick={() => copyToClipboard(withdrawal.bank_account_number || "", "N° cuenta")} className="text-muted-foreground hover:text-foreground">
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{timeAgo(withdrawal.created_at)}</span>
                            </div>
                            <p className="text-xs mt-0.5">
                              {new Date(withdrawal.created_at).toLocaleDateString("es-CL", {
                                day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                              })}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                disabled={processingId === withdrawal.id}
                                onClick={() => setConfirmWithdrawalId(withdrawal.id)}
                              >
                                <CheckCircle className="mr-1 h-4 w-4" />
                                Aprobar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={processingId === withdrawal.id}
                                onClick={() => handleRejectMovement(withdrawal.id)}
                              >
                                {processingId === withdrawal.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1" />
                                ) : (
                                  <XCircle className="mr-1 h-4 w-4" />
                                )}
                                Rechazar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {pendingWithdrawals.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No hay retiros pendientes
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="approved">
              <Card>
                <CardHeader>
                  <CardTitle>Retiros Aprobados</CardTitle>
                  <CardDescription>Últimos 20 retiros procesados</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Datos Bancarios</TableHead>
                        <TableHead>Fecha Aprobación</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedWithdrawals.map((withdrawal) => (
                        <TableRow key={withdrawal.id}>
                          <TableCell className="font-medium">{withdrawal.user_name}</TableCell>
                          <TableCell>{withdrawal.user_email}</TableCell>
                          <TableCell className="font-bold text-warning">
                            -${formatCLP(withdrawal.amount)}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs space-y-1">
                              <p><strong>Titular:</strong> {withdrawal.bank_holder_name}</p>
                              <p><strong>RUT:</strong> {withdrawal.bank_holder_rut}</p>
                              <p><strong>Banco:</strong> {withdrawal.bank_name}</p>
                              <p><strong>Tipo:</strong> {withdrawal.bank_account_type}</p>
                              <p><strong>N° Cuenta:</strong> {withdrawal.bank_account_number}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(withdrawal.reviewed_at || withdrawal.created_at).toLocaleDateString("es-CL", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                      {approvedWithdrawals.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No hay retiros aprobados
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Salas de Venta - Modo Consulta
                </div>
              </CardTitle>
              <CardDescription>
                Vista de todas las transacciones. Los usuarios gestionan sus propias salas de venta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Comprador</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Creación</TableHead>
                    <TableHead>Ver</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">{transaction.product_name}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{transaction.seller?.full_name || "N/A"}</div>
                          <div className="text-sm text-muted-foreground">
                            {transaction.seller?.email || ""}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {transaction.buyer ? (
                          <div>
                            <div className="font-medium">{transaction.buyer.full_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {transaction.buyer.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Sin comprador</span>
                        )}
                      </TableCell>
                      <TableCell className="font-bold text-right">
                        ${formatCLP(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={stateLabels[transaction.state]?.color as any || "secondary"}>
                          {stateLabels[transaction.state]?.label || transaction.state}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(transaction.created_at).toLocaleDateString("es-CL")}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/transaction/${transaction.id}`, '_blank')}
                        >
                          Ver Detalles
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {transactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No hay transacciones registradas
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appeals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Apelaciones</CardTitle>
              <CardDescription>Revisa y resuelve las apelaciones de transacciones</CardDescription>
            </CardHeader>
            <CardContent>
              <AdminAppealsList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="returns" className="space-y-4">
          <AdminReturnMediationList />
        </TabsContent>

        <TabsContent value="tokens" className="space-y-4">
          {/* Token Summary Cards - Primera fila: Métricas principales */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-2 border-primary/30 bg-primary/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cuenta Trado (Obligación)</CardTitle>
                <Building className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">${formatCLP(tokenStats.expectedBankBalance)}</div>
                <p className="text-xs text-muted-foreground">Depósitos - Retiros (debe haber en banco)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pertenece a Usuarios</CardTitle>
                <Coins className="h-4 w-4 text-info" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-info">${formatCLP(tokenStats.totalCirculating)}</div>
                <p className="text-xs text-muted-foreground">Balance actual en wallets</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-success/30 bg-success/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pertenece a Trado</CardTitle>
                <BadgeDollarSign className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">${formatCLP(tokenStats.totalCommissions)}</div>
                <p className="text-xs text-muted-foreground">Comisiones cobradas (ganancias)</p>
              </CardContent>
            </Card>
            <Card className={tokenStats.discrepancy === 0 ? "border-2 border-success/50 bg-success/5" : "border-2 border-destructive/50 bg-destructive/5"}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estado Sistema</CardTitle>
                {tokenStats.discrepancy === 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${tokenStats.discrepancy === 0 ? "text-success" : "text-destructive"}`}>
                  {tokenStats.discrepancy === 0 ? "✓ Cuadra" : `$${formatCLP(Math.abs(tokenStats.discrepancy))}`}
                </div>
                <p className="text-xs text-muted-foreground">
                  {tokenStats.discrepancy === 0 ? "Sistema balanceado" : tokenStats.discrepancy > 0 ? "Faltante en wallets" : "Exceso en wallets"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Segunda fila: Métricas de flujo */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Depósitos Históricos</CardTitle>
                <ArrowDownCircle className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">${formatCLP(tokenStats.totalDeposits)}</div>
                <p className="text-xs text-muted-foreground">Total entrado al sistema</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Retiros Históricos</CardTitle>
                <ArrowUpCircle className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">${formatCLP(tokenStats.totalWithdrawals)}</div>
                <p className="text-xs text-muted-foreground">Total salido del sistema</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Escrow Activo</CardTitle>
                <Lock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${formatCLP(tokenStats.activeEscrow)}</div>
                <p className="text-xs text-muted-foreground">Bloqueado en transacciones</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Comisiones</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${formatCLP(tokenStats.totalCommissions)}</div>
                <p className="text-xs text-muted-foreground">De transacciones completadas</p>
              </CardContent>
            </Card>
          </div>

          {/* Reconciliation Panel - Mejorado */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Reconciliación Contable
              </CardTitle>
              <CardDescription>Verificación del balance del sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Ecuación Principal */}
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <h4 className="font-semibold mb-3">Ecuación de Balance:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-center text-center">
                    <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                      <div className="text-xs text-muted-foreground">Depósitos</div>
                      <div className="text-lg font-bold text-success">${formatCLP(tokenStats.totalDeposits)}</div>
                    </div>
                    <div className="text-xl font-bold hidden md:block">−</div>
                    <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                      <div className="text-xs text-muted-foreground">Retiros</div>
                      <div className="text-lg font-bold text-warning">${formatCLP(tokenStats.totalWithdrawals)}</div>
                    </div>
                    <div className="text-xl font-bold hidden md:block">−</div>
                    <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                      <div className="text-xs text-muted-foreground">Comisiones</div>
                      <div className="text-lg font-bold">${formatCLP(tokenStats.totalCommissions)}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <div className="text-2xl font-bold">=</div>
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="text-xs text-muted-foreground">Balance Teórico en Wallets</div>
                      <div className="text-xl font-bold text-primary">${formatCLP(tokenStats.theoreticalWalletBalance)}</div>
                    </div>
                    <div className="text-xl">vs</div>
                    <div className="p-3 rounded-lg bg-info/10 border border-info/20">
                      <div className="text-xs text-muted-foreground">Balance Real en Wallets</div>
                      <div className="text-xl font-bold text-info">${formatCLP(tokenStats.totalCirculating)}</div>
                    </div>
                  </div>
                </div>

                {/* Desglose de Cuenta Trado */}
                <div className="p-4 rounded-lg border bg-card">
                  <h4 className="font-semibold mb-3">Desglose de Cuenta Bancaria Trado:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="text-sm text-muted-foreground">Debe haber en cuenta</div>
                      <div className="text-xl font-bold text-primary">${formatCLP(tokenStats.expectedBankBalance)}</div>
                      <div className="text-xs text-muted-foreground mt-1">Depósitos - Retiros</div>
                    </div>
                    <div className="p-3 rounded-lg bg-info/10 border border-info/20">
                      <div className="text-sm text-muted-foreground">De eso, es de usuarios</div>
                      <div className="text-xl font-bold text-info">${formatCLP(tokenStats.totalCirculating)}</div>
                      <div className="text-xs text-muted-foreground mt-1">Obligación con usuarios</div>
                    </div>
                    <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                      <div className="text-sm text-muted-foreground">De eso, es de Trado</div>
                      <div className="text-xl font-bold text-success">${formatCLP(tokenStats.totalCommissions)}</div>
                      <div className="text-xs text-muted-foreground mt-1">Comisiones (ganancia)</div>
                    </div>
                  </div>
                </div>

                {/* Estado de Reconciliación */}
                {tokenStats.discrepancy !== 0 && (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="font-semibold">Discrepancia Detectada</span>
                    </div>
                    <p className="text-sm mt-2">
                      Diferencia de <strong>${formatCLP(Math.abs(tokenStats.discrepancy))}</strong> entre el balance teórico y real. 
                      {tokenStats.discrepancy > 0 
                        ? " Faltan tokens en las wallets de usuarios." 
                        : " Hay más tokens en wallets de lo que debería haber."}
                    </p>
                  </div>
                )}

                {tokenStats.discrepancy === 0 && (
                  <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                    <div className="flex items-center gap-2 text-success">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-semibold">Sistema Reconciliado</span>
                    </div>
                    <p className="text-sm mt-2">
                      ✓ Depósitos - Retiros - Comisiones = Balance en Wallets<br/>
                      ✓ Cuenta Trado = Obligación con Usuarios + Ganancias de Trado
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Movements by Type */}
          <Card>
            <CardHeader>
              <CardTitle>Movimientos por Tipo</CardTitle>
              <CardDescription>Resumen de movimientos aprobados por categoría</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Monto Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokenStats.movementsByType.map((movement) => (
                    <TableRow key={movement.type}>
                      <TableCell className="font-medium">
                        <Badge variant={
                          movement.type === "deposit" ? "default" :
                          movement.type === "withdrawal" ? "secondary" :
                          movement.type === "escrow_lock" ? "outline" :
                          movement.type === "escrow_release" ? "outline" : "default"
                        }>
                          {movement.type === "deposit" && "Depósito"}
                          {movement.type === "withdrawal" && "Retiro"}
                          {movement.type === "escrow_lock" && "Bloqueo Escrow"}
                          {movement.type === "escrow_release" && "Liberación Escrow"}
                          {!["deposit", "withdrawal", "escrow_lock", "escrow_release"].includes(movement.type) && movement.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{movement.count}</TableCell>
                      <TableCell className="text-right font-bold">${formatCLP(movement.total)}</TableCell>
                    </TableRow>
                  ))}
                  {tokenStats.movementsByType.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        No hay movimientos registrados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Wallet Details */}
          <Card>
            <CardHeader>
              <CardTitle>Detalle de Wallets</CardTitle>
              <CardDescription>Balance individual de cada usuario (ordenado por balance)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">% del Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokenStats.walletDetails.map((wallet, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{wallet.user_name}</TableCell>
                      <TableCell>{wallet.user_email}</TableCell>
                      <TableCell className="text-right font-bold">${formatCLP(wallet.balance)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {tokenStats.totalCirculating > 0 
                          ? ((wallet.balance / tokenStats.totalCirculating) * 100).toFixed(1) 
                          : 0}%
                      </TableCell>
                    </TableRow>
                  ))}
                  {tokenStats.walletDetails.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No hay wallets registrados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject Verification Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Verificación</DialogTitle>
            <DialogDescription>
              Por favor, especifica el motivo del rechazo. Este mensaje será enviado al usuario por email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Motivo del Rechazo</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Ej: La imagen del documento no es clara. Por favor, sube una foto con mejor iluminación donde se vean todos los datos de forma legible."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={5}
                className="resize-none"
              />
              <p className="text-sm text-muted-foreground">
                Sé específico sobre qué debe mejorar el usuario para aprobar su verificación.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRejectVerification}>
              Rechazar y Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdrawal confirmation dialog */}
      <Dialog open={!!confirmWithdrawalId} onOpenChange={() => setConfirmWithdrawalId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar aprobación de retiro</DialogTitle>
            <DialogDescription>
              Asegúrate de haber realizado la transferencia bancaria antes de aprobar.
            </DialogDescription>
          </DialogHeader>
          {pendingWithdrawal && (
            <div className="space-y-3 py-2">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Monto</span>
                <span className="font-bold text-lg">-${formatCLP(pendingWithdrawal.amount)}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Titular</span>
                  <span className="font-medium">{pendingWithdrawal.bank_holder_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">RUT</span>
                  <div className="flex items-center gap-2">
                    <span>{pendingWithdrawal.bank_holder_rut}</span>
                    <button onClick={() => copyToClipboard(pendingWithdrawal.bank_holder_rut || "", "RUT")}>
                      <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Banco</span>
                  <span>{pendingWithdrawal.bank_name} · {pendingWithdrawal.bank_account_type}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">N° Cuenta</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{pendingWithdrawal.bank_account_number}</span>
                    <button onClick={() => copyToClipboard(pendingWithdrawal.bank_account_number || "", "N° cuenta")}>
                      <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmWithdrawalId(null)}>Cancelar</Button>
            <Button
              disabled={processingId === confirmWithdrawalId}
              onClick={async () => {
                if (confirmWithdrawalId) {
                  await handleApproveMovement(confirmWithdrawalId);
                  setConfirmWithdrawalId(null);
                }
              }}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirmar Aprobación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
