

## Plan: Preparar Trado para Produccion Global

Basado en el analisis del codigo, la auditoria de seguridad y las funcionalidades existentes, estas son las mejoras necesarias organizadas por prioridad.

---

### Prioridad 1: Seguridad Critica

#### 1.1 Proteger datos sensibles en perfiles
- **Problema**: La tabla `profiles` expone datos bancarios, RUT, documentos de verificacion en cada consulta.
- **Solucion**: Crear una vista `profiles_public` (sin datos bancarios/verificacion) y usar `get_safe_profile` consistentemente. Crear funcion `get_own_bank_details` para cuando el usuario necesite sus datos bancarios.

#### 1.2 Habilitar proteccion contra passwords filtradas
- **Problema**: La proteccion de passwords filtradas esta deshabilitada.
- **Solucion**: Activarla via configuracion de autenticacion del backend.

#### 1.3 Proteger vista `wallet_movements_safe`
- **Problema**: No tiene RLS y podria exponer datos financieros de todos los usuarios.
- **Solucion**: Agregar RLS o revocar acceso publico y usar solo funciones security definer.

#### 1.4 Crear componente ProtectedRoute
- **Problema**: Cada pagina maneja la autenticacion individualmente con `useEffect`, lo que es fragil e inconsistente.
- **Solucion**: Crear `<ProtectedRoute>` que envuelva rutas autenticadas, redirigiendo a `/auth` si no hay sesion.

---

### Prioridad 2: Robustez y Confiabilidad

#### 2.1 Rate limiting en formularios criticos
- Agregar throttling client-side en login, registro, reenvio de email y recuperacion de contrasena para evitar abuso.
- Implementar un hook `useThrottle` reutilizable.

#### 2.2 Manejo de sesion expirada
- Detectar errores 401 en respuestas de Supabase y redirigir al login automaticamente con mensaje informativo.
- Agregar interceptor global en el cliente Supabase (via wrapper).

#### 2.3 Pagina 404 mejorada
- Verificar que la pagina NotFound tenga navegacion de vuelta y sea util.

---

### Prioridad 3: Experiencia de Usuario para Uso Frecuente

#### 3.1 Loading states consistentes
- Agregar skeletons en Dashboard, Transaction y Wallet para mejorar percepcion de velocidad.

#### 3.2 Actualizar copyright del footer
- Cambiar "2024" a "2025" en el footer de Index.

#### 3.3 PWA / Installable
- Agregar manifest.json y service worker basico para que la app sea instalable en moviles.
- Esto facilita uso frecuente ya que los usuarios pueden "instalar" la app.

---

### Prioridad 4: Preparacion para Escala

#### 4.1 Paginacion en historial de transacciones
- Si no existe, agregar paginacion para manejar usuarios con muchas transacciones (limite de 1000 filas de Supabase).

#### 4.2 Manejo de errores global
- Agregar un Error Boundary de React para capturar errores inesperados y mostrar pantalla amigable en vez de pantalla blanca.

---

### Archivos a Crear/Modificar

| Archivo | Accion |
|---|---|
| `src/components/ProtectedRoute.tsx` | Crear |
| `src/App.tsx` | Envolver rutas protegidas |
| `src/hooks/useThrottle.ts` | Crear |
| `src/pages/Auth.tsx` | Agregar throttling |
| `src/pages/Index.tsx` | Actualizar copyright |
| `src/components/ErrorBoundary.tsx` | Crear |
| Migracion SQL | Proteger `wallet_movements_safe`, crear vista segura de profiles |
| Config auth backend | Habilitar leaked password protection |

### Estimacion
Esto se implementaria en varias iteraciones. Recomiendo empezar por **Prioridad 1** (seguridad) ya que es bloqueante para produccion.

