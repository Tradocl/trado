import { supabase } from "@/lib/supabase";
import { formatCLP } from "@/lib/utils";

export const UNVERIFIED_LIMITS = {
  PER_TRANSACTION: 100000,  // $100.000 CLP
  TOTAL_ACCUMULATED: 200000  // $200.000 CLP
};

/**
 * Calcula el total acumulado de transacciones completadas de un usuario
 */
export async function calculateUserTotalTransactions(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("transactions")
    .select("amount")
    .or(`seller_id.eq.${userId},buyer_id.eq.${userId}`)
    .eq("state", "completed");

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

/**
 * Calcula el total de depósitos aprobados de un usuario
 */
export async function calculateUserTotalDeposits(userId: string): Promise<number> {
  const { data: wallet } = await supabase
    .from("wallets")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!wallet) return 0;

  const { data, error } = await supabase
    .from("wallet_movements")
    .select("amount")
    .eq("wallet_id", wallet.id)
    .eq("type", "deposit")
    .eq("status", "approved");

  if (error) {
    console.error("Error calculating total deposits:", error);
    return 0;
  }

  return data?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0;
}

/**
 * Verifica si un usuario puede realizar un depósito según su estado de verificación
 */
export async function checkDepositLimits(
  userId: string,
  newDepositAmount: number,
  isVerified: boolean
): Promise<{ allowed: boolean; message?: string }> {
  if (isVerified) {
    return { allowed: true };
  }

  if (newDepositAmount > UNVERIFIED_LIMITS.PER_TRANSACTION) {
    return {
      allowed: false,
      message: `Sin verificación, el máximo por depósito es $${formatCLP(UNVERIFIED_LIMITS.PER_TRANSACTION)} CLP. Verifica tu identidad para depositar sin límite.`,
    };
  }

  const totalDeposits = await calculateUserTotalDeposits(userId);

  if (totalDeposits + newDepositAmount > UNVERIFIED_LIMITS.TOTAL_ACCUMULATED) {
    const remaining = Math.max(0, UNVERIFIED_LIMITS.TOTAL_ACCUMULATED - totalDeposits);
    return {
      allowed: false,
      message: remaining > 0
        ? `Sin verificación, tu límite acumulado de depósitos es $${formatCLP(UNVERIFIED_LIMITS.TOTAL_ACCUMULATED)} CLP. Te quedan $${formatCLP(remaining)} CLP disponibles.`
        : `Has alcanzado el límite acumulado de depósitos para usuarios no verificados. Verifica tu identidad para continuar.`,
    };
  }

  return { allowed: true };
}
