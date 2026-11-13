import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, Calendar as CalendarIcon, Filter } from "lucide-react";
import { toast } from "sonner";
import { formatCLP } from "@/lib/utils";

interface Movement {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  balance_after: number;
}

export default function MovementHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [filteredMovements, setFilteredMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadMovements();
  }, [user, navigate]);

  useEffect(() => {
    applyFilters();
  }, [movements, statusFilter, typeFilter, dateFrom, dateTo]);

  const loadMovements = async () => {
    try {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id")
        .eq("user_id", user!.id)
        .single();

      if (!wallet) return;

      // Use safe view that masks sensitive banking data
      const { data, error } = await supabase
        .from("wallet_movements_safe")
        .select("*")
        .eq("wallet_id", wallet.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMovements(data || []);
    } catch (error: any) {
      console.error("Error loading movements:", error);
      toast.error("Error al cargar el historial");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...movements];

    if (statusFilter !== "all") {
      filtered = filtered.filter((m) => m.status === statusFilter);
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((m) => m.type === typeFilter);
    }

    if (dateFrom) {
      filtered = filtered.filter((m) => new Date(m.created_at) >= dateFrom);
    }

    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter((m) => new Date(m.created_at) <= endOfDay);
    }

    setFilteredMovements(filtered);
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setTypeFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      approved: "default",
      pending: "secondary",
      rejected: "destructive",
      cancelled: "outline",
    };
    const labels: Record<string, string> = {
      approved: "Aprobado",
      pending: "En revisión",
      rejected: "Rechazado",
      cancelled: "Cancelado",
    };
    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const typeConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      deposit: { label: "Depósito", variant: "default" },
      withdrawal: { label: "Retiro", variant: "secondary" },
      escrow_lock: { label: "Bloqueo Garantía", variant: "outline" },
      escrow_release: { label: "Liberación Venta", variant: "default" },
    };
    const config = typeConfig[type] || { label: type, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
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
      <Button variant="ghost" onClick={() => navigate("/wallet")} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a Billetera
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Movimientos</CardTitle>
          <CardDescription>
            Historial completo de todos tus movimientos de billetera
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 mb-6">
            <div className="flex-1 min-w-[130px]">
              <label className="text-sm font-medium mb-2 block">Estado</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">En revisión</SelectItem>
                  <SelectItem value="approved">Aprobados</SelectItem>
                  <SelectItem value="rejected">Rechazados</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[130px]">
              <label className="text-sm font-medium mb-2 block">Tipo</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="deposit">Depósitos</SelectItem>
                  <SelectItem value="withdrawal">Retiros</SelectItem>
                  <SelectItem value="escrow_lock">Bloqueos Garantía</SelectItem>
                  <SelectItem value="escrow_release">Liberaciones Venta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[130px]">
              <label className="text-sm font-medium mb-2 block">Desde</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal text-xs sm:text-sm">
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    {dateFrom ? format(dateFrom, "dd/MM/yy") : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={es} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex-1 min-w-[130px]">
              <label className="text-sm font-medium mb-2 block">Hasta</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal text-xs sm:text-sm">
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    {dateTo ? format(dateTo, "dd/MM/yy") : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={es} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="col-span-2 sm:col-span-1 flex sm:items-end">
              <Button variant="outline" className="w-full sm:w-auto" onClick={clearFilters}>
                <Filter className="mr-2 h-4 w-4" />
                Limpiar Filtros
              </Button>
            </div>
          </div>

          {/* Results count */}
          <div className="mb-4 text-sm text-muted-foreground">
            Mostrando {filteredMovements.length} de {movements.length} movimientos
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead className="hidden sm:table-cell">Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden md:table-cell whitespace-nowrap">Revisado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No se encontraron movimientos
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMovements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                        {format(new Date(movement.created_at), "dd/MM/yy HH:mm")}
                      </TableCell>
                      <TableCell>{getTypeBadge(movement.type)}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        <span className={movement.amount < 0 ? "text-destructive" : "text-success"}>
                          {movement.amount < 0 ? "-" : "+"}${formatCLP(Math.abs(movement.amount))}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell max-w-[200px] truncate">
                        {movement.description || "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(movement.status)}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs whitespace-nowrap">
                        {movement.reviewed_at
                          ? format(new Date(movement.reviewed_at), "dd/MM/yy")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
