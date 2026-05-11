/**
 * Translates technical Postgres / trigger errors into friendly Spanish messages.
 */
const ERROR_MAP: { match: string; message: string }[] = [
  { match: "No autorizado a modificar buyer_id", message: "Alguien más ya se unió a esta transacción" },
  { match: "No autorizado a modificar seller_id", message: "Alguien más ya se unió a esta transacción" },
  { match: "Solo puedes unirte como comprador a ti mismo", message: "No puedes unirte en nombre de otro usuario" },
  { match: "Solo puedes unirte como vendedor a ti mismo", message: "No puedes unirte en nombre de otro usuario" },
  { match: "No autorizado a modificar state", message: "Esta acción no está permitida en el estado actual" },
  { match: "No autorizado a cambiar amount del movimiento", message: "No puedes editar este movimiento" },
  { match: "No puedes modificar un movimiento que ya no está pendiente", message: "Este movimiento ya fue procesado" },
  { match: "El RUT bancario debe coincidir con el RUT de tu perfil", message: "El RUT de la cuenta bancaria debe coincidir con el tuyo" },
  { match: "No autorizado a modificar is_verified", message: "Solo el equipo de Trado puede modificar este campo" },
  { match: "Completa tu RUT antes de solicitar retiros", message: "Completa tu RUT en el perfil antes de solicitar retiros" },
];

export function translateError(error: any): string {
  const raw =
    (typeof error === "string" ? error : error?.message || error?.error_description || error?.error || "") || "";

  for (const entry of ERROR_MAP) {
    if (raw.includes(entry.match)) return entry.message;
  }

  return raw || "Ocurrió un error. Intenta nuevamente.";
}
