import { supabase } from "@/lib/supabase";
import { formatCLP } from "@/lib/utils";

export { UNVERIFIED_LIMITS } from "@/lib/escrow";
import { UNVERIFIED_LIMITS } from "@/lib/escrow";

// El comentario que explica estos topes vive en escrow.ts, junto al valor.

/**
 * Calcula el total acumulado de transacciones completadas de un usuario
 */
export async function calculateUserTotalTransactions(userId: string): Promise<number> {
  // Cuenta todo lo que no esté cancelado, no sólo lo completado: si contara
  // sólo lo cerrado, alguien podría abrir varias salas a la vez y superar el
  // tope entre todas sin que ninguna lo supere por sí sola.
  const { data, error } = await supabase
    .from("transactions")
    .select("amount")
    .or(`seller_id.eq.${userId},buyer_id.eq.${userId}`)
    .neq("state", "cancelled");

  if (error) {
    console.error("Error calculating total transactions:", error);
    return 0;
  }

  return data?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
}

/**
 * Verifica si un usuario puede realizar una transacción dado su estado de verificación
 */
export async function checkTransactionLimits(
  userId: string, 
  newTransactionAmount: number, 
  isVerified: boolean
): Promise<{ allowed: boolean; message?: string }> {
  // Usuarios verificados no tienen límites
  if (isVerified) {
    return { allowed: true };
  }
  
  // Verificar límite por transacción individual
  if (newTransactionAmount > UNVERIFIED_LIMITS.PER_TRANSACTION) {
    return { 
      allowed: false, 
      message: `Sin verificación, el máximo por transacción es $${formatCLP(UNVERIFIED_LIMITS.PER_TRANSACTION)} CLP. Verifica tu identidad para transacciones sin límite.` 
    };
  }
  
  // Calcular total acumulado de transacciones completadas
  const totalAccumulated = await calculateUserTotalTransactions(userId);
  
  if (totalAccumulated + newTransactionAmount > UNVERIFIED_LIMITS.TOTAL_ACCUMULATED) {
    const remaining = Math.max(0, UNVERIFIED_LIMITS.TOTAL_ACCUMULATED - totalAccumulated);
    return { 
      allowed: false, 
      message: remaining > 0 
        ? `Sin verificación, tu límite acumulado es $${formatCLP(UNVERIFIED_LIMITS.TOTAL_ACCUMULATED)} CLP. Te quedan $${formatCLP(remaining)} CLP disponibles. Verifica tu identidad para transacciones sin límite.`
        : `Has alcanzado el límite acumulado de $${formatCLP(UNVERIFIED_LIMITS.TOTAL_ACCUMULATED)} CLP para usuarios no verificados. Verifica tu identidad para continuar.`
    };
  }
  
  return { allowed: true };
}

/**
 * Obtiene el estado de verificación de un usuario
 */
export async function getUserVerificationStatus(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_verified")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  return data.is_verified || false;
}
