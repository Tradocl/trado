

## Resumen Completo de Trado para Migración a App Móvil

Te preparo un documento exhaustivo que cubra arquitectura, funcionalidades, base de datos, flujos y consideraciones para que otra IA (o desarrollador) pueda llevar Trado a una app nativa de celular.

### Qué incluirá el documento

1. **Visión general del producto**
   - Qué es Trado (escrow P2P para Chile)
   - Mercado objetivo y propuesta de valor
   - Modelo de negocio (comisión sobre transacciones)

2. **Stack tecnológico actual**
   - Frontend: React 18 + Vite + TypeScript + Tailwind + shadcn/ui
   - Backend: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
   - PWA configurada con vite-plugin-pwa
   - Routing: react-router-dom

3. **Arquitectura de base de datos**
   - Tablas principales: profiles, transactions, wallets, wallet_movements, ratings, appeals, returns, user_roles, verification_documents
   - Relaciones y RLS policies
   - Funciones SECURITY DEFINER (has_role, get_safe_profile, get_own_bank_details, etc.)
   - Storage buckets (avatars, chat-files, appeal-evidence, verification-documents)

4. **Edge Functions desplegadas** (lista completa con propósito)
   - process-escrow-deposit, confirm-delivery, resolve-appeal, process-return-refund
   - Notificaciones (notify-* y send-*)
   - Manejo de email vía Resend

5. **Funcionalidades core**
   - Autenticación (email/password + Google OAuth, verificación de email)
   - Sistema de billetera (depósitos manuales por transferencia, retiros con datos bancarios del usuario, saldo y saldo bloqueado)
   - Flujo de transacciones (creación con código de invitación, join, escrow, marcado de envío, confirmación, completado)
   - Sistema de apelaciones (9 estados, chat privado con archivos, negociación 48h, intervención de plataforma, ratings post-resolución)
   - Sistema de devoluciones (mediación admin, refund automático)
   - Verificación de identidad (subida de documentos, revisión admin)
   - Ratings y reputación
   - Panel de administración (apelaciones, devoluciones, retiros)
   - Chat de transacciones con archivos
   - Propuestas de reunión presencial
   - Notificaciones por email (Resend)

6. **Flujos de usuario detallados**
   - Onboarding (signup → verificación email → completar perfil)
   - Crear venta (vendedor) y unirse (comprador)
   - Depósito en escrow → entrega → confirmación → liberación
   - Apelación de disputa
   - Retiro de fondos

7. **Consideraciones para migración a móvil nativo**
   - **Opción A: Capacitor** (reusa el código React actual, más rápido)
     - appId: app.lovable.f99bb00449564c2ba5871488b9889a8d
     - Requiere `npx cap add ios/android`, build, sync
     - Ventajas: 95% del código se reusa
   - **Opción B: React Native / Expo** (reescritura completa)
     - Mantener Supabase como backend (cliente JS funciona igual)
     - Reescribir UI con componentes nativos
     - Mayor performance pero más trabajo
   - **Opción C: Flutter / Kotlin nativo** (reescritura total)
   - Componentes a adaptar: file pickers para documentos/avatares, deep linking para invite codes, push notifications (FCM/APNs en vez de email), cámara para verificación
   - Variables de entorno necesarias: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY (o equivalentes según framework)

8. **Restricciones y contexto chileno**
   - Sin pasarela de pago integrada (transferencias bancarias manuales)
   - Razones regulatorias (CMF, Ley Fintech 21.521)
   - Validación de RUT, ubicaciones chilenas
   - Moneda CLP sin decimales

9. **Lo que NO incluye Trado actualmente** (para que la nueva IA sepa qué falta)
   - Pasarela de pagos automática (Khipu/Fintoc pendientes)
   - Push notifications nativas
   - Modo offline real
   - Geolocalización para reuniones

### Formato de entrega

Generaré un archivo **`Trado-Resumen-Completo.md`** en `/mnt/documents/` que puedes copiar y pegar en cualquier otra IA (ChatGPT, Claude, Gemini, Cursor, etc.) como contexto inicial para iniciar la migración a móvil. El archivo será autocontenido — incluirá todo lo necesario para que la otra IA entienda Trado sin acceso a este proyecto.

### Lo que NO haré

- No modificaré código de la app actual.
- No iniciaré la migración a móvil — solo preparo el documento de contexto.
- No incluiré secretos ni claves reales (solo nombres de variables).

