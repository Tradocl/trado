// Shared validation and sanitization utilities for edge functions

/**
 * Sanitizes a string for safe HTML output by escaping HTML special characters
 */
export function sanitizeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates and sanitizes a string with max length
 */
export function validateString(value: unknown, maxLength: number = 500): string {
  if (typeof value !== 'string') return '';
  return sanitizeHtml(value.substring(0, maxLength));
}

/**
 * Validates an email format
 */
export function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validates a positive number
 */
export function validateAmount(value: unknown): number {
  const num = Number(value);
  if (isNaN(num) || num < 0) return 0;
  return Math.min(num, 999999999); // Cap at reasonable max
}

/**
 * Validates a UUID format
 */
export function isValidUuid(uuid: unknown): boolean {
  if (typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Formats a number as Chilean currency
 */
export function formatCLP(amount: number): string {
  return amount.toLocaleString('es-CL');
}

/**
 * Creates a standardized error response
 */
export function errorResponse(message: string, status: number = 400, corsHeaders: Record<string, string>) {
  console.error(`Error: ${message}`);
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status, 
      headers: { "Content-Type": "application/json", ...corsHeaders } 
    }
  );
}
