# Auditoría de correos y limpieza del email obsoleto de transferencia

## Hallazgo principal

El correo **"Instrucciones de Pago"** (`send-payment-instructions`) ya no tiene sentido:

- Le pide al comprador transferir manualmente a la cuenta Mercado Pago de Trado (RUT 78.236.214-3, cuenta 1020783447) y poner el código en el asunto.
- Hoy el depósito se hace por la **pasarela de Mercado Pago** (`create-mercadopago-payment` + `mercadopago-webhook` + `process-escrow-deposit`), no por transferencia manual.
- Se sigue enviando automáticamente cuando un comprador se une a una transacción (`src/pages/Transaction.tsx:757`), así que los compradores reciben instrucciones contradictorias respecto al flujo real en la app.

Adicionalmente, el HTML del correo usa un degradado morado que rompe la identidad visual actual de Trado (indigo `#1f2bd8`, mismo estilo que `signup.tsx` / `invite.tsx`).

## Revisión del resto de correos

Revisé los 15 edge functions de correo. El resto se mantiene coherente con el flujo actual:

| Correo | Trigger | Estado |
|---|---|---|
| `auth-email-hook` (signup, recovery, magic-link, invite, email-change, reauth) | Supabase Auth | OK, branding indigo |
| `send-welcome-email` | Post-registro | OK |
| `notify-verification-submitted` / `send-verification-result` | Verificación de identidad | OK |
| `notify-transaction-created` | Creación de sala | OK |
| `notify-transaction-action` (buyer_joined, funds_deposited, marked_shipped, marked_received, funds_released, meeting_*, appeal_*, return_*) | Acciones de transacción | OK, textos coherentes |
| `notify-transaction-completed` | Cierre | OK |
| `notify-meeting-proposal` | Encuentros presenciales | OK |
| `notify-appeal-escalation` / `notify-appeal-resolved` | Apelaciones | OK |
| `notify-wallet-movement` | Solicitud de depósito/retiro | OK (mensajes genéricos, sirven para MP y retiro manual) |
| `send-movement-notification` | Admin aprueba/rechaza movimiento | OK |
| `send-payment-instructions` | `buyer_joined` | **Obsoleto** |

No detecté otros correos con contenido desfasado respecto al flujo Mercado Pago.

## Cambios propuestos

1. **Eliminar la llamada obsoleta en el frontend**
   - `src/pages/Transaction.tsx` (~línea 755-762): borrar el `supabase.functions.invoke("send-payment-instructions", …)` que se ejecuta tras unirse a una transacción. El usuario ya ve el botón "Pagar con Mercado Pago" en la pantalla; no necesita instrucciones manuales por correo.

2. **Reemplazar el correo por uno alineado al gateway** (recomendado, opcional)
   - Reescribir `send-payment-instructions/index.ts` como **"Tu orden está lista para pagar"**:
     - Saludo + nombre del producto + monto + código de referencia.
     - Eliminar bloque "Datos Bancarios" y la advertencia de poner el código en el asunto.
     - CTA único: **"Pagar con Mercado Pago"** que apunta a `${SITE_URL}/transaction/${transactionId}` (ahí el comprador dispara el checkout MP).
     - Mantener nota corta sobre custodia en escrow.
     - Aplicar el estilo de marca indigo (`#1f2bd8`) consistente con `signup.tsx` / `invite.tsx`, en vez del degradado morado.
   - Volver a invocarlo desde `Transaction.tsx` solo si decidimos mantener el aviso por correo. Si prefieres eliminarlo del todo, lo borramos junto con la edge function.

3. **No tocar el resto** de edge functions ni plantillas — ya están alineadas al flujo actual.

## Pregunta antes de implementar

¿Cuál opción prefieres para el correo de "instrucciones de pago"?

- **A)** Eliminarlo por completo (borrar la invocación y la edge function `send-payment-instructions`). El comprador ya tiene el botón de MP en la app, así no duplicamos canales.
- **B)** Reescribirlo como "Tu orden está lista para pagar" con CTA a Mercado Pago y branding indigo, y seguir enviándolo al unirse a la transacción.

Con eso confirmo y aplico los cambios.
