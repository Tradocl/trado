/**
 * Cuánto se puede retirar al banco.
 *
 * La plata que entró por tarjeta (MercadoPago) y no se gastó en una sala
 * completada sólo puede volver a esa tarjeta: si se pudiera retirar a una cuenta
 * bancaria, una tarjeta robada se convertiría en efectivo con un depósito, una
 * sala que nunca se completa y un retiro. Es lo que pasó con los depósitos que
 * hubo que devolver a mano en septiembre de 2026.
 *
 * ⚠️ ESPEJO de public.withdrawable_balance() en la base, que es quien manda:
 * rechaza el retiro aunque la pantalla lo permita. Si cambias uno, cambia el otro.
 */
export function retirableAlBanco(params: {
  balance: number;
  gatewayFunded: number;
  pendingWithdrawals: number;
}): number {
  const balance = Math.max(0, Number(params.balance) || 0);
  const deTarjeta = Math.min(Math.max(0, Number(params.gatewayFunded) || 0), balance);
  const reservado = Math.max(0, Number(params.pendingWithdrawals) || 0);
  return Math.max(0, balance - deTarjeta - reservado);
}

/** Plata de tarjeta que todavía se puede devolver (nunca más que el saldo). */
export function reembolsableATarjeta(params: { balance: number; gatewayFunded: number }): number {
  const balance = Math.max(0, Number(params.balance) || 0);
  return Math.min(Math.max(0, Number(params.gatewayFunded) || 0), balance);
}
