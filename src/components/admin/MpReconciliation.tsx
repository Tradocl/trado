import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { formatCLP } from "@/lib/utils";

/**
 * Cuadratura Mercado Pago ↔ Trado (Edge Function reconcile-mercadopago).
 * La misma corre sola cada 30 min; acá se puede ver y correr a pedido.
 * Si encuentra un pago de Trado aprobado en MP que no está en ninguna
 * billetera, lo acredita (idempotente). Las diferencias que no puede
 * resolver sola (reembolsos en MP sin registro, montos distintos) se listan.
 */
interface Informe {
  generado: string;
  dias: number;
  mercado_pago: {
    pagos_revisados: number;
    aprobados_trado: number;
    bruto: number;
    comision_mp: number;
    neto_recibido: number;
    reembolsado_mp: number;
    reembolsado_trado: number;
    ajenos_a_trado: { pago: string; estado: string; monto: number; fecha: string; descripcion: string | null }[];
  };
  trado: { pasivo_usuarios: { saldo: number; retenido: number; marca_tarjeta: number } };
  acreditados_ahora: { pago: string; monto: number }[];
  diferencias: { pago: string; tipo: string; detalle: string }[];
  cuadra: boolean;
}

const TIPO: Record<string, string> = {
  no_acreditado: "Cobrado en MP y no acreditado",
  monto_distinto: "El monto no calza",
  reembolso_no_registrado: "Devuelto en MP sin registro en Trado",
  reembolso_de_mas: "Trado registró más reembolso que MP",
};

export function MpReconciliation() {
  const [informe, setInforme] = useState<Informe | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const correr = async () => {
    setCargando(true);
    setError(null);
    const { data, error } = await supabase.functions.invoke("reconcile-mercadopago?dias=60", { method: "GET" });
    if (error || (data as { error?: string })?.error) {
      setError(error?.message ?? (data as { error: string }).error);
    } else {
      setInforme(data as Informe);
    }
    setCargando(false);
  };

  useEffect(() => {
    correr();
  }, []);

  const mp = informe?.mercado_pago;
  const pasivo = informe?.trado.pasivo_usuarios;

  return (
    <Card className={informe ? (informe.cuadra ? "border-2 border-success/40" : "border-2 border-destructive/40") : ""}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            {informe && (informe.cuadra
              ? <CheckCircle2 className="h-5 w-5 text-success" />
              : <AlertTriangle className="h-5 w-5 text-destructive" />)}
            Cuadratura con Mercado Pago
          </CardTitle>
          <CardDescription>
            Cada pago de Trado en MP contra lo registrado en las billeteras. Corre sola cada 30 minutos
            y acredita lo que el aviso de MP no alcanzó a registrar.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={correr} disabled={cargando}>
          <RefreshCw className={`h-4 w-4 mr-2 ${cargando ? "animate-spin" : ""}`} />
          Revisar ahora
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">No se pudo revisar: {error}</p>}
        {!informe && !error && <p className="text-sm text-muted-foreground">Revisando…</p>}

        {informe && mp && pasivo && (
          <>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              <div className="p-3 rounded-lg border">
                <div className="text-xs text-muted-foreground">Pagos de Trado en MP ({informe.dias} días)</div>
                <div className="text-lg font-bold">{mp.aprobados_trado} · ${formatCLP(mp.bruto)}</div>
              </div>
              <div className="p-3 rounded-lg border">
                <div className="text-xs text-muted-foreground">Devuelto a tarjetas</div>
                <div className="text-lg font-bold">
                  MP ${formatCLP(mp.reembolsado_mp)} · Trado ${formatCLP(mp.reembolsado_trado)}
                </div>
              </div>
              <div className="p-3 rounded-lg border">
                <div className="text-xs text-muted-foreground">Comisión MP / neto recibido</div>
                <div className="text-lg font-bold">${formatCLP(mp.comision_mp)} / ${formatCLP(mp.neto_recibido)}</div>
              </div>
              <div className="p-3 rounded-lg border">
                <div className="text-xs text-muted-foreground">Trado le debe hoy a usuarios</div>
                <div className="text-lg font-bold">${formatCLP(pasivo.saldo + pasivo.retenido)}</div>
                <div className="text-xs text-muted-foreground">De eso, reservar en MP: ${formatCLP(pasivo.marca_tarjeta)}</div>
              </div>
            </div>

            {informe.acreditados_ahora.length > 0 && (
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
                Acreditados recién por la cuadratura (el aviso de MP no había llegado):{" "}
                {informe.acreditados_ahora.map((a) => `#${a.pago} $${formatCLP(a.monto)}`).join(", ")}
              </div>
            )}

            {informe.diferencias.length === 0 ? (
              <p className="text-sm text-success">✓ Cada pago de Trado en Mercado Pago está registrado en Trado, con sus reembolsos.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-destructive">Diferencias que no se corrigen solas:</p>
                {informe.diferencias.map((d) => (
                  <div key={d.pago + d.tipo} className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="destructive">{TIPO[d.tipo] ?? d.tipo}</Badge>
                    <span className="font-mono">#{d.pago}</span>
                    <span className="text-muted-foreground">{d.detalle}</span>
                  </div>
                ))}
              </div>
            )}

            {mp.ajenos_a_trado.length > 0 && (
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Cobros en MP que no salieron de la app (no se acreditan a nadie):</p>
                {mp.ajenos_a_trado.map((a) => (
                  <div key={a.pago}>
                    #{a.pago} · ${formatCLP(a.monto)} · {new Date(a.fecha).toLocaleString("es-CL")} · {a.estado}
                    {a.descripcion ? ` · ${a.descripcion}` : ""}
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              El saldo que muestra Mercado Pago no tiene por qué ser igual a lo de los usuarios: incluye las comisiones
              de Trado, cobros que no son de la app y plata ya transferida al banco. Lo que tiene que cumplirse siempre
              es que MP + banco cubran lo que Trado le debe a los usuarios.
              Revisado: {new Date(informe.generado).toLocaleString("es-CL")}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
