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
import { ArrowLeft, CheckCircle, XCircle, Users, Wallet, Shield, TrendingUp, ShoppingBag, Scale } from "lucide-react";
import { formatCLP } from "@/lib/utils";
import { AdminAppealsList } from "@/components/admin/AdminAppealsList";

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
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingVerifications: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    totalTransactions: 0,
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

      // Load pending verifications
      const { data: verificationsData, error: verificationsError } = await supabase
        .from("profiles")
        .select("id, full_name, email, verification_status, verification_document_url, verification_selfie_url, verification_submitted_at")
        .in("verification_status", ["pending", "in_review"])
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

      setStats({
        totalUsers: profilesData?.length || 0,
        pendingVerifications: verificationsData?.length || 0,
        pendingDeposits: pendingDepositsData?.length || 0,
        pendingWithdrawals: pendingWithdrawalsData?.length || 0,
        totalTransactions: transactionsData?.length || 0,
      });
    } catch (error) {
      console.error("Error loading admin data:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveMovement = async (movementId: string) => {
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

      // Update movement status
      const { error: movementError } = await supabase
        .from("wallet_movements")
        .update({
          status: "approved",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          balance_after: newBalance,
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
            description: movement.description,
          },
        });
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        // Don't fail the approval if email fails
      }

      toast.success(`${movement.type === "deposit" ? "Depósito" : "Retiro"} aprobado exitosamente`);
      loadAdminData();
    } catch (error) {
      console.error("Error approving movement:", error);
      toast.error("Error al aprobar el movimiento");
    }
  };

  const handleRejectMovement = async (movementId: string) => {
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
    }
  };

  const handleApproveVerification = async (profileId: string) => {
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

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
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
                              onClick={() =>
                                window.open(verification.verification_document_url!, "_blank")
                              }
                            >
                              Ver Carnet
                            </Button>
                          )}
                          {verification.verification_selfie_url && (
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() =>
                                window.open(verification.verification_selfie_url!, "_blank")
                              }
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
                            onClick={() => handleApproveVerification(verification.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
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
                      {pendingDeposits.map((deposit) => (
                        <TableRow key={deposit.id}>
                          <TableCell className="font-medium">{deposit.user_name}</TableCell>
                          <TableCell>{deposit.user_email}</TableCell>
                          <TableCell className="font-bold text-success">
                            +${formatCLP(deposit.amount)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(deposit.created_at).toLocaleDateString("es-CL", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApproveMovement(deposit.id)}
                              >
                                <CheckCircle className="mr-1 h-4 w-4" />
                                Aprobar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRejectMovement(deposit.id)}
                              >
                                <XCircle className="mr-1 h-4 w-4" />
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
                      {pendingWithdrawals.map((withdrawal) => (
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
                            {new Date(withdrawal.created_at).toLocaleDateString("es-CL", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApproveMovement(withdrawal.id)}
                              >
                                <CheckCircle className="mr-1 h-4 w-4" />
                                Aprobar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRejectMovement(withdrawal.id)}
                              >
                                <XCircle className="mr-1 h-4 w-4" />
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
    </div>
  );
}
