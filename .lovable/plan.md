
## Objetivo

Refrescar el diseño visual de toda la app autenticada (sin tocar la landing `/`) y añadir una barra de navegación inferior fija en móvil para acceder rápido a las secciones principales. Solo cambios visuales, ninguna lógica de negocio se modifica.

## 1. Bottom Navigation móvil

Nuevo componente `src/components/MobileBottomNav.tsx`:

- Fijo en la parte inferior (`fixed bottom-0 inset-x-0 z-40`), solo visible en móvil (`md:hidden`) usando `useIsMobile`.
- Fondo con blur (`bg-background/85 backdrop-blur-lg border-t`), sombra superior sutil, safe-area inset para iOS (`pb-[env(safe-area-inset-bottom)]`).
- 5 ítems con icono + label corto:
  1. Inicio → `/dashboard` (Home)
  2. Transacciones → `/transaction-history` (Repeat/ShoppingBag)
  3. Crear (botón central destacado, círculo con gradient primario, ligeramente elevado) → `/create-transaction` (Plus)
  4. Billetera → `/wallet` (Wallet)
  5. Perfil → `/profile` (User)
- Item activo: color `text-primary` + indicador (punto o barra superior), inactivo `text-muted-foreground`.
- Se monta una sola vez en `App.tsx` dentro de `AuthProvider`, condicionado a que haya sesión y la ruta no sea pública (`/`, `/auth`, `/terms`, `/privacy`, `/reset-password`, `/verificar-email`, `/invite/*`).
- Las páginas autenticadas reciben `pb-20 md:pb-0` para evitar que el contenido quede tapado (se aplicará vía clase en los contenedores raíz de cada página).

## 2. Sistema visual unificado

Ajustes en `src/index.css` (tokens existentes, sin romper la landing):

- Añadir tokens auxiliares: `--surface` (card sutilmente diferenciada del background), `--surface-elevated`, `--shadow-card`, `--radius-lg: 1rem`.
- Definir clases utilitarias reutilizables:
  - `.app-shell` → contenedor principal con `min-h-screen bg-gradient-to-b from-background to-muted/30`.
  - `.app-header` → header sticky translúcido con blur, borde inferior suave, altura uniforme.
  - `.section-card` → card con `rounded-2xl border bg-card shadow-sm hover:shadow-md transition-shadow`.
  - `.stat-tile` → para tarjetas tipo balance/estadística.
- Tipografía: títulos de página `text-2xl md:text-3xl font-semibold tracking-tight`, subtítulos `text-sm text-muted-foreground`.
- Consistencia de espaciado: `container mx-auto px-4 md:px-6 py-6 md:py-8 max-w-5xl`.

## 3. Header de app unificado

Nuevo componente `src/components/AppHeader.tsx` (reemplaza headers ad-hoc en páginas internas):

- Logo a la izquierda (clickable → dashboard).
- Título de página opcional al centro/izquierda.
- Acciones a la derecha: notificaciones, menú usuario (avatar con dropdown: Perfil, Admin si aplica, Cerrar sesión).
- En móvil: oculta acciones secundarias, deja solo logo + avatar (el resto vive en el bottom nav).
- Sticky con blur.

## 4. Páginas a refrescar (solo estilo, no lógica)

Aplicar `app-shell` + `AppHeader` + `section-card` y limpiar layouts en:

- `Dashboard.tsx` — reorganizar en grilla limpia: tarjeta de saldo destacada arriba, accesos rápidos como tiles grandes, lista de transacciones recientes en card.
- `Wallet.tsx` — hero de balance con gradient, tabs más limpios, formularios con espaciado consistente.
- `Profile.tsx` — secciones colapsables con cards uniformes.
- `Transaction.tsx`, `TransactionHistory.tsx` — listas con cards más respirables, badges de estado más sutiles.
- `CreateTransaction.tsx`, `JoinTransaction.tsx`, `InviteWelcome.tsx` — wizards centrados con max-width contenido.
- `Verification.tsx`, `MovementHistory.tsx`, `PublicProfile.tsx`, `Appeal.tsx`, `AdminAppeal.tsx`, `ReturnRoom.tsx`, `AdminReturnRoom.tsx`, `Admin.tsx` — mismo tratamiento.
- `Auth.tsx`, `ResetPassword.tsx`, `VerifyEmail.tsx` — card centrada con logo, fondo con gradient sutil, sin bottom nav.
- `NotFound.tsx`, `Terms.tsx`, `Privacy.tsx` — tipografía limpia, max-width legible.

## 5. Detalles de pulido

- Badges de estado: variantes suaves (`bg-{color}/10 text-{color} border-{color}/20`) en vez de sólidos saturados.
- Botones primarios mantienen gradient; ghost/outline para secundarios.
- Inputs: altura uniforme `h-11`, `rounded-xl`.
- Animaciones de entrada (`animate-in fade-in slide-in-from-bottom-2`) en cards principales (respeta la regla de memoria de "entrance animations for modals/cards").
- Loading skeletons consistentes donde haya spinners genéricos.

## Lo que NO se toca

- `src/pages/Index.tsx` (landing) — intacto.
- Lógica de negocio, queries, edge functions, RLS, validaciones, flujos.
- Tokens de color base (primary, success, etc.) — solo se añaden auxiliares.

## Entregable

Después de aprobar, implemento en este orden:
1. Tokens + utilidades en `index.css`.
2. `MobileBottomNav` + `AppHeader` + montaje en `App.tsx`.
3. Refactor visual de Dashboard, Wallet, Profile (las más visibles).
4. Resto de páginas internas con el mismo patrón.
