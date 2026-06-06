# Perfiles demo para post de Instagram

Voy a crear **2 cuentas ficticias** con datos realistas pero 100% inventados, para que puedas grabar el flujo completo (crear sala → invitar → escrow → entrega → liberación) sin exponer información personal real.

## Qué se va a crear

**Cuenta Vendedor — "Camila Rojas" (@camirojas)**
- Email: `demo.vendedor@trado.cl` / Pass: `DemoTrado2026!`
- RUT ficticio válido, teléfono +56 9 0000 1111
- Verificada (badge verde)
- Reputación: 4.9 estrellas, 47 transacciones completadas
- Saldo billetera: $850.000 CLP disponible
- Datos bancarios ficticios cargados

**Cuenta Comprador — "Matías Soto" (@matisoto)**
- Email: `demo.comprador@trado.cl` / Pass: `DemoTrado2026!`
- RUT ficticio válido, teléfono +56 9 0000 2222
- Verificado
- Reputación: 4.8 estrellas, 32 transacciones completadas
- Saldo billetera: $1.200.000 CLP disponible (para que pueda depositar al escrow sin fricción)

## Calificaciones de fondo

Para que los perfiles públicos se vean "vivos", voy a insertar **8-10 ratings** por cuenta con comentarios realistas en español (ej: "Excelente vendedor, todo tal cual lo describió", "Súper rápido el envío", "Muy buena comunicación"), firmados por nombres ficticios genéricos ("Andrea P.", "Felipe M.", etc.) — sin tocar perfiles reales.

## Cómo se hace técnicamente

1. Crear los 2 usuarios vía `auth.admin.createUser` (email confirmado, sin enviar correos).
2. Trigger `handle_new_user` crea profile + wallet automáticamente.
3. UPDATE en `profiles`: nickname, avatar (iniciales), `is_verified=true`, `verification_status='approved'`, `reputation_score`, `total_transactions`, datos bancarios ficticios, `profile_completed=true`.
4. UPDATE en `wallets`: setear `balance` inicial.
5. INSERT en `ratings`: ~10 calificaciones por cuenta con `rater_id` apuntando a UUIDs ficticios (creo 4-5 perfiles "fantasma" mínimos solo con nombre para que aparezca el autor del rating).

## Después de grabar

Cuando termines el post, te dejo lista una limpieza con un solo comando para borrar las 2 cuentas + perfiles fantasma + ratings + wallets, y dejar todo como estaba.

¿Apruebas? Si quieres cambio nombres, avatares, montos o cantidad de ratings antes de ejecutar.