/**
 * Cuenta donde los usuarios transfieren para cargar saldo. Es una Cuenta Vista
 * de MercadoPago: las transferencias caen en el mismo saldo con el que se
 * reembolsan los pagos con tarjeta.
 */
export const TRADO_BANK = {
  name: "Sociedad Comercial Trado Limitada",
  rut: "78.236.214-3",
  bank: "Mercado Pago",
  accountType: "Cuenta Vista",
  accountNumber: "1038152132",
  email: "contacto@trado.cl",
} as const;

/** Texto listo para pegar en la app del banco o guardarse en notas. */
export function tradoBankText(): string {
  return [
    TRADO_BANK.name,
    `RUT: ${TRADO_BANK.rut}`,
    `Banco: ${TRADO_BANK.bank}`,
    `Tipo de cuenta: ${TRADO_BANK.accountType}`,
    `N° de cuenta: ${TRADO_BANK.accountNumber}`,
    `Email: ${TRADO_BANK.email}`,
  ].join("\n");
}

/**
 * Los bancos limitan la primera transferencia a un destinatario nuevo, por
 * seguridad. Por eso conviene agregar a Trado ANTES de tener que pagar.
 * Valores públicos de cada banco a septiembre de 2026; son orientativos y
 * pueden cambiar, por eso en pantalla se muestran como ejemplo.
 */
export const LIMITE_PRIMERA_TRANSFERENCIA_EJEMPLO = "entre $200.000 y $350.000";

/**
 * Umbrales del depósito por transferencia (sobre el monto a depositar).
 * ⚠️ ESPEJO de OFFER_TRANSFER_AT en supabase/functions/request-transfer-deposit.
 */
export const OFFER_TRANSFER_AT = 400_000;
export const FORCE_TRANSFER_AT = 1_150_000;
