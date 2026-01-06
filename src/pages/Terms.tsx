import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Scale, FileText, AlertTriangle, Clock, CreditCard, Users, Lock } from "lucide-react";
import tradoLogo from "@/assets/trado-logo.png";

const Terms = () => {
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
            <img src={tradoLogo} alt="Trado" className="h-12 w-12" />
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              Términos y Condiciones
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
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">1. Introducción</h2>
            </div>
            <div className="text-muted-foreground space-y-4">
              <p>
                Bienvenido a Trado. Estos Términos y Condiciones regulan el uso de nuestra plataforma 
                de compra-venta con sistema de escrow (depósito en garantía) para transacciones entre 
                particulares en Chile.
              </p>
              <p>
                Al registrarte y utilizar Trado, aceptas estos términos en su totalidad. Si no estás 
                de acuerdo con alguna parte, te recomendamos no utilizar nuestros servicios.
              </p>
            </div>
          </section>

          {/* Escrow Service */}
          <section className="bg-card rounded-2xl p-8 border border-border shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-success/10 rounded-lg">
                <Shield className="h-6 w-6 text-success" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">2. Servicio de Escrow</h2>
            </div>
            <div className="text-muted-foreground space-y-4">
              <p>
                <strong className="text-foreground">2.1. Definición:</strong> El servicio de escrow 
                consiste en retener el dinero del comprador hasta que se confirme la recepción 
                satisfactoria del producto o servicio acordado.
              </p>
              <p>
                <strong className="text-foreground">2.2. Proceso:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>El vendedor crea una transacción especificando el producto y precio.</li>
                <li>El comprador deposita el monto acordado en la billetera de Trado.</li>
                <li>Los fondos quedan retenidos de forma segura.</li>
                <li>El vendedor realiza la entrega del producto o servicio.</li>
                <li>El comprador confirma la recepción satisfactoria.</li>
                <li>Los fondos se liberan al vendedor (menos la comisión).</li>
              </ul>
              <p>
                <strong className="text-foreground">2.3. Rol de Trado:</strong> Actuamos únicamente 
                como intermediario financiero. No somos responsables de la calidad, autenticidad o 
                estado de los productos/servicios transaccionados.
              </p>
            </div>
          </section>

          {/* Fees */}
          <section className="bg-card rounded-2xl p-8 border border-border shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-warning/10 rounded-lg">
                <CreditCard className="h-6 w-6 text-warning" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">3. Comisiones y Tarifas</h2>
            </div>
            <div className="text-muted-foreground space-y-4">
              <p>
                <strong className="text-foreground">3.1. Comisión por transacción:</strong> Trado 
                cobra una comisión del <strong className="text-foreground">3%</strong> sobre el 
                valor total de cada transacción completada exitosamente.
              </p>
              <p>
                <strong className="text-foreground">3.2. Momento del cobro:</strong> La comisión 
                se descuenta automáticamente al momento de liberar los fondos al vendedor.
              </p>
              <p>
                <strong className="text-foreground">3.3. Transacciones canceladas:</strong> No se 
                cobra comisión en transacciones canceladas antes de que el comprador confirme la 
                recepción, y los fondos se devuelven íntegramente.
              </p>
            </div>
          </section>

          {/* Users */}
          <section className="bg-card rounded-2xl p-8 border border-border shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-info/10 rounded-lg">
                <Users className="h-6 w-6 text-info" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">4. Usuarios y Verificación</h2>
            </div>
            <div className="text-muted-foreground space-y-4">
              <p>
                <strong className="text-foreground">4.1. Requisitos:</strong> Debes ser mayor de 
                18 años y tener capacidad legal para celebrar contratos en Chile.
              </p>
              <p>
                <strong className="text-foreground">4.2. Verificación de identidad:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Usuarios sin verificar:</strong> Límite máximo de $100.000 CLP por 
                  transacción y $200.000 CLP acumulados.
                </li>
                <li>
                  <strong>Usuarios verificados:</strong> Sin límites de monto. Requiere envío 
                  de documento de identidad (carnet) y selfie de verificación.
                </li>
              </ul>
              <p>
                <strong className="text-foreground">4.3. Información veraz:</strong> Te comprometes 
                a proporcionar información verdadera, completa y actualizada. Trado puede suspender 
                cuentas con información falsa.
              </p>
            </div>
          </section>

          {/* Disputes */}
          <section className="bg-card rounded-2xl p-8 border border-border shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <Scale className="h-6 w-6 text-destructive" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">5. Disputas y Resolución de Conflictos</h2>
            </div>
            <div className="text-muted-foreground space-y-4">
              <p>
                <strong className="text-foreground">5.1. Apertura de disputa:</strong> Si el 
                producto/servicio no corresponde a lo acordado, el comprador puede abrir una 
                disputa antes de confirmar la recepción.
              </p>
              <p>
                <strong className="text-foreground">5.2. Proceso de mediación:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Ambas partes pueden subir evidencia (fotos, mensajes, etc.).</li>
                <li>Se incentiva el acuerdo mutuo entre las partes.</li>
                <li>Si no hay acuerdo, el equipo de Trado revisará el caso.</li>
                <li>Trado emitirá una resolución vinculante basada en la evidencia.</li>
              </ul>
              <p>
                <strong className="text-foreground">5.3. Resoluciones posibles:</strong> Liberación 
                total al vendedor, reembolso total al comprador, o división proporcional según 
                las circunstancias.
              </p>
            </div>
          </section>

          {/* Timeframes */}
          <section className="bg-card rounded-2xl p-8 border border-border shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">6. Plazos</h2>
            </div>
            <div className="text-muted-foreground space-y-4">
              <p>
                <strong className="text-foreground">6.1. Confirmación de recepción:</strong> El 
                comprador debe confirmar o disputar dentro de las 72 horas siguientes a la 
                entrega marcada por el vendedor.
              </p>
              <p>
                <strong className="text-foreground">6.2. Retiros:</strong> Las solicitudes de 
                retiro se procesan en 1-2 días hábiles hacia la cuenta bancaria registrada.
              </p>
              <p>
                <strong className="text-foreground">6.3. Disputas:</strong> Las partes tienen 
                48 horas para negociar un acuerdo mutuo antes de que el caso pase a revisión 
                de la plataforma.
              </p>
            </div>
          </section>

          {/* Prohibitions */}
          <section className="bg-card rounded-2xl p-8 border border-border shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">7. Prohibiciones</h2>
            </div>
            <div className="text-muted-foreground space-y-4">
              <p>Está estrictamente prohibido utilizar Trado para:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Productos o servicios ilegales en Chile.</li>
                <li>Armas, drogas, medicamentos sin receta.</li>
                <li>Productos falsificados o robados.</li>
                <li>Servicios sexuales o contenido para adultos.</li>
                <li>Lavado de dinero o financiamiento ilícito.</li>
                <li>Fraude, estafa o cualquier actividad delictiva.</li>
                <li>Evadir los mecanismos de seguridad de la plataforma.</li>
              </ul>
              <p>
                El incumplimiento resultará en la suspensión inmediata de la cuenta y posible 
                denuncia a las autoridades competentes.
              </p>
            </div>
          </section>

          {/* Privacy */}
          <section className="bg-card rounded-2xl p-8 border border-border shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-info/10 rounded-lg">
                <Lock className="h-6 w-6 text-info" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">8. Privacidad y Datos</h2>
            </div>
            <div className="text-muted-foreground space-y-4">
              <p>
                <strong className="text-foreground">8.1. Datos recopilados:</strong> Recopilamos 
                información personal necesaria para operar el servicio: nombre, RUT, email, 
                teléfono, datos bancarios y documentos de verificación.
              </p>
              <p>
                <strong className="text-foreground">8.2. Uso de datos:</strong> Utilizamos tus 
                datos únicamente para prestar el servicio, verificar tu identidad, procesar 
                transacciones y cumplir con obligaciones legales.
              </p>
              <p>
                <strong className="text-foreground">8.3. Seguridad:</strong> Implementamos 
                medidas de seguridad técnicas y organizativas para proteger tu información 
                personal contra acceso no autorizado.
              </p>
            </div>
          </section>

          {/* Liability */}
          <section className="bg-card rounded-2xl p-8 border border-border shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Scale className="h-6 w-6 text-warning" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">9. Limitación de Responsabilidad</h2>
            </div>
            <div className="text-muted-foreground space-y-4">
              <p>
                <strong className="text-foreground">9.1.</strong> Trado no es responsable por:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>La calidad, autenticidad o estado de los productos/servicios.</li>
                <li>El cumplimiento de las obligaciones entre compradores y vendedores.</li>
                <li>Pérdidas indirectas, incidentales o consecuentes.</li>
                <li>Interrupciones del servicio por causas de fuerza mayor.</li>
              </ul>
              <p>
                <strong className="text-foreground">9.2.</strong> Nuestra responsabilidad máxima 
                se limita al monto de las comisiones cobradas en la transacción en cuestión.
              </p>
            </div>
          </section>

          {/* Modifications */}
          <section className="bg-card rounded-2xl p-8 border border-border shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">10. Modificaciones</h2>
            </div>
            <div className="text-muted-foreground space-y-4">
              <p>
                Trado se reserva el derecho de modificar estos términos en cualquier momento. 
                Los cambios serán notificados por email y/o mediante aviso en la plataforma. 
                El uso continuado después de los cambios constituye aceptación de los nuevos términos.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-br from-primary/10 to-info/10 rounded-2xl p-8 border border-primary/20">
            <h2 className="text-2xl font-bold text-foreground mb-4">Contacto</h2>
            <p className="text-muted-foreground mb-4">
              Para consultas sobre estos términos o el funcionamiento de Trado, contáctanos en:
            </p>
            <div className="space-y-2 text-muted-foreground">
              <p><strong className="text-foreground">Email:</strong> soporte@trado.cl</p>
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

export default Terms;
