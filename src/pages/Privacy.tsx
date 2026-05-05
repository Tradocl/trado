import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Database, Eye, Lock, Share2, UserCheck, Bell, Trash2, Mail } from "lucide-react";
import { Logo } from "@/components/Logo";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-primary-light to-info py-12">
        <div className="container mx-auto px-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/10 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          
          <div className="flex items-center gap-4 mb-4">
            <Logo variant="white" height={48} />
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              Política de Privacidad
            </h1>
          </div>
          <p className="text-white/80 text-lg">
            Última actualización: Diciembre 2024
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-12">
          
          {/* Introduction */}
          <section className="bg-card rounded-2xl p-8 border border-border shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">1. Introducción</h2>
            </div>
            <div className="text-muted-foreground space-y-4">
              <p>
                En Trado nos comprometemos a proteger tu privacidad y la seguridad de tus datos 
                personales. Esta Política de Privacidad explica cómo recopilamos, usamos, 
                almacenamos y protegemos tu información cuando utilizas nuestra plataforma.
              </p>
              <p>
                Al utilizar Trado, aceptas las prácticas descritas en esta política. Te 
                recomendamos leerla detenidamente para entender cómo tratamos tu información.
              </p>
            </div>
          </section>

          {/* Data We Collect */}
          <section className="bg-card rounded-2xl p-8 border border-border shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-info/10 rounded-lg">
                <Database className="h-6 w-6 text-info" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">2. Datos que Recopilamos</h2>
            </div>
            <div className="text-muted-foreground space-y-4">
              <p>
                <strong className="text-foreground">2.1. Datos de registro:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Nombre completo:</strong> Para identificarte en la plataforma.</li>
                <li><strong>RUT:</strong> Para verificar tu identidad y cumplir con regulaciones.</li>
                <li><strong>Correo electrónico:</strong> Para comunicaciones y acceso a la cuenta.</li>
                <li><strong>Teléfono:</strong> Para contacto y notificaciones importantes.</li>
                <li><strong>Dirección:</strong> Para facilitar entregas en transacciones.</li>
              </ul>
              
              <p>
                <strong className="text-foreground">2.2. Datos bancarios:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Nombre del banco y tipo de cuenta.</li>
                <li>Número de cuenta (almacenado de forma segura).</li>
                <li>Nombre del titular y RUT bancario.</li>
              </ul>
              
              <p>
                <strong className="text-foreground">2.3. Datos de verificación:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Foto del documento de identidad (carnet).</li>
                <li>Selfie de verificación.</li>
              </ul>
              
              <p>
                <strong className="text-foreground">2.4. Datos de uso:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Historial de transacciones en la plataforma.</li>
                <li>Mensajes intercambiados con otros usuarios.</li>
                <li>Calificaciones y comentarios.</li>
                <li>Registros de actividad y acceso.</li>
              </ul>
            </div>
          </section>

          {/* How We Use Data */}
          <section className="bg-card rounded-2xl p-8 border border-border shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-success/10 rounded-lg">
                <Eye className="h-6 w-6 text-success" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">3. Cómo Usamos tus Datos</h2>
            </div>
            <div className="text-muted-foreground space-y-4">
              <p>Utilizamos tu información personal para:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Prestar el servicio:</strong> Procesar transacciones, gestionar tu billetera, facilitar la comunicación entre usuarios.</li>
                <li><strong>Verificar tu identidad:</strong> Prevenir fraudes y cumplir con normativas de prevención de lavado de activos.</li>
                <li><strong>Mejorar la plataforma:</strong> Analizar patrones de uso para optimizar la experiencia.</li>
                <li><strong>Comunicaciones:</strong> Enviarte notificaciones sobre tus transacciones, actualizaciones de servicio y promociones (con tu consentimiento).</li>
                <li><strong>Seguridad:</strong> Detectar y prevenir actividades fraudulentas o ilegales.</li>
                <li><strong>Cumplimiento legal:</strong> Responder a requerimientos de autoridades competentes.</li>
              </ul>
            </div>
          </section>

          {/* Data Sharing */}
          <section className="bg-card rounded-2xl p-8 border border-border shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Share2 className="h-6 w-6 text-warning" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">4. Compartición de Datos</h2>
            </div>
            <div className="text-muted-foreground space-y-4">
              <p>
                <strong className="text-foreground">4.1. Con otros usuarios:</strong> Compartimos 
                información limitada necesaria para completar transacciones:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Nombre o apodo.</li>
                <li>Calificación y reputación.</li>
                <li>Estado de verificación.</li>
                <li>Mensajes de chat relacionados con la transacción.</li>
              </ul>
              
              <p>
                <strong className="text-foreground">4.2. Con terceros:</strong> NO vendemos ni 
                alquilamos tu información personal. Podemos compartir datos con:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Proveedores de servicios:</strong> Procesadores de pago, servicios de email, almacenamiento en la nube (bajo estrictos acuerdos de confidencialidad).</li>
                <li><strong>Autoridades:</strong> Cuando sea requerido por ley o para proteger derechos legales.</li>
              </ul>
            </div>
          </section>

          {/* Data Protection */}
          <section className="bg-card rounded-2xl p-8 border border-border shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">5. Protección de Datos</h2>
            </div>
            <div className="text-muted-foreground space-y-4">
              <p>Implementamos medidas de seguridad técnicas y organizativas para proteger tus datos:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Encriptación:</strong> Todos los datos sensibles se almacenan y transmiten de forma encriptada (SSL/TLS).</li>
                <li><strong>Acceso restringido:</strong> Solo personal autorizado puede acceder a información personal.</li>
                <li><strong>Autenticación segura:</strong> Contraseñas hasheadas y opción de autenticación de dos factores.</li>
                <li><strong>Monitoreo:</strong> Sistemas de detección de accesos no autorizados.</li>
                <li><strong>Backups:</strong> Copias de seguridad regulares para prevenir pérdida de datos.</li>
              </ul>
              <p>
                Los documentos de verificación (fotos de carnet y selfies) se almacenan en servidores 
                seguros con acceso restringido exclusivamente al equipo de verificación.
              </p>
            </div>
          </section>

          {/* User Rights */}
          <section className="bg-card rounded-2xl p-8 border border-border shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-info/10 rounded-lg">
                <UserCheck className="h-6 w-6 text-info" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">6. Tus Derechos</h2>
            </div>
            <div className="text-muted-foreground space-y-4">
              <p>Como usuario de Trado, tienes derecho a:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Acceso:</strong> Solicitar una copia de los datos personales que tenemos sobre ti.</li>
                <li><strong>Rectificación:</strong> Corregir datos inexactos o desactualizados.</li>
                <li><strong>Eliminación:</strong> Solicitar la eliminación de tus datos personales (sujeto a obligaciones legales de retención).</li>
                <li><strong>Portabilidad:</strong> Recibir tus datos en un formato estructurado y legible.</li>
                <li><strong>Oposición:</strong> Oponerte al procesamiento de tus datos para ciertos fines.</li>
                <li><strong>Retiro de consentimiento:</strong> Retirar tu consentimiento en cualquier momento para comunicaciones promocionales.</li>
              </ul>
              <p>
                Para ejercer estos derechos, contáctanos en <strong className="text-foreground">privacidad@trado.cl</strong>
              </p>
            </div>
          </section>

          {/* Data Retention */}
          <section className="bg-card rounded-2xl p-8 border border-border shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Trash2 className="h-6 w-6 text-warning" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">7. Retención de Datos</h2>
            </div>
            <div className="text-muted-foreground space-y-4">
              <p>
                <strong className="text-foreground">7.1. Datos de cuenta:</strong> Mantenemos tus 
                datos mientras tu cuenta esté activa. Si solicitas eliminar tu cuenta, eliminaremos 
                o anonimizaremos tus datos dentro de 30 días, excepto cuando debamos retenerlos por 
                obligaciones legales.
              </p>
              <p>
                <strong className="text-foreground">7.2. Datos de transacciones:</strong> Por 
                regulaciones financieras y tributarias, debemos mantener registros de transacciones 
                por un período mínimo de 5 años.
              </p>
              <p>
                <strong className="text-foreground">7.3. Documentos de verificación:</strong> Se 
                eliminan automáticamente 12 meses después de la verificación exitosa, manteniendo 
                solo el estado de verificación.
              </p>
            </div>
          </section>

          {/* Cookies */}
          <section className="bg-card rounded-2xl p-8 border border-border shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-success/10 rounded-lg">
                <Bell className="h-6 w-6 text-success" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">8. Cookies y Tecnologías Similares</h2>
            </div>
            <div className="text-muted-foreground space-y-4">
              <p>Utilizamos cookies y tecnologías similares para:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Cookies esenciales:</strong> Necesarias para el funcionamiento de la plataforma (sesión, autenticación).</li>
                <li><strong>Cookies de preferencias:</strong> Recordar tus configuraciones (tema, idioma).</li>
                <li><strong>Cookies analíticas:</strong> Entender cómo usas la plataforma para mejorarla.</li>
              </ul>
              <p>
                Puedes configurar tu navegador para rechazar cookies, aunque esto puede afectar 
                algunas funcionalidades de la plataforma.
              </p>
            </div>
          </section>

          {/* Changes */}
          <section className="bg-card rounded-2xl p-8 border border-border shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">9. Cambios a esta Política</h2>
            </div>
            <div className="text-muted-foreground space-y-4">
              <p>
                Podemos actualizar esta Política de Privacidad ocasionalmente. Te notificaremos 
                sobre cambios significativos por correo electrónico o mediante un aviso destacado 
                en la plataforma. Te recomendamos revisar esta política periódicamente.
              </p>
              <p>
                La fecha de "Última actualización" al inicio de este documento indica cuándo se 
                realizaron los cambios más recientes.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-br from-primary/10 to-info/10 rounded-2xl p-8 border border-primary/20">
            <h2 className="text-2xl font-bold text-foreground mb-4">Contacto</h2>
            <p className="text-muted-foreground mb-4">
              Si tienes preguntas sobre esta Política de Privacidad o sobre cómo manejamos tus 
              datos personales, contáctanos:
            </p>
            <div className="space-y-2 text-muted-foreground">
              <p><strong className="text-foreground">Email general:</strong> admin@trado.cl</p>
              <p><strong className="text-foreground">Privacidad:</strong> privacidad@trado.cl</p>
              <p><strong className="text-foreground">Horario:</strong> Lunes a Viernes, 9:00 - 18:00 hrs</p>
            </div>
          </section>

          {/* Back button */}
          <div className="text-center pt-8">
            <Button
              onClick={() => navigate("/")}
              className="bg-primary hover:bg-primary/90"
            >
              Volver al Inicio
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
