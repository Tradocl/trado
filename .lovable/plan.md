
## Plan: Implementar Confirmación de Correo Electrónico

### Cambios Necesarios

#### 1. Configurar Confirmación de Email en Lovable Cloud
- Habilitar la opción "Confirm email" en la configuración de autenticación del backend
- Esto activará el envío automático de emails de verificación cuando alguien se registra

#### 2. Modificar el Flujo de Registro (`src/pages/Auth.tsx`)
- Después del registro exitoso, mostrar un mensaje indicando que se envió un email de verificación
- NO redirigir al dashboard inmediatamente
- Mostrar instrucciones claras: "Revisa tu correo y haz clic en el enlace para activar tu cuenta"

#### 3. Crear Página de Verificación Pendiente
- Nueva página `/verificar-email` que muestre:
  - Mensaje de confirmación de que se envió el email
  - Instrucciones para revisar el correo (incluyendo spam)
  - Botón para reenviar el email de verificación
  - Opción para cambiar el correo si se equivocaron

#### 4. Manejar el Estado de Email No Confirmado
- Modificar `AuthContext` para detectar si el email está confirmado
- Si un usuario intenta iniciar sesión sin confirmar su email, mostrar mensaje explicativo
- Ofrecer reenvío del email de verificación

#### 5. Personalizar el Email de Verificación (Opcional)
- Crear una edge function para enviar un email de verificación con el diseño de Trado
- Incluir el logo y colores de la marca
- Mensaje en español

### Flujo del Usuario

```
1. Usuario completa formulario de registro
2. Se crea la cuenta (sin confirmar)
3. Se envía email con enlace de verificación
4. Usuario ve página "Revisa tu correo"
5. Usuario hace clic en el enlace del email
6. Email queda confirmado
7. Usuario puede acceder al dashboard
```

### Consideraciones
- Los usuarios que ya se registraron seguirán funcionando normalmente
- Los nuevos usuarios deberán confirmar su email
- Se puede configurar un tiempo límite para la confirmación (24-48 horas)
