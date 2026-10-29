-- ============================================================================
-- Cuentas de empresa
-- ============================================================================
--
-- Una cuenta es de empresa cuando su RUT es de 50.000.000 o más (esRutEmpresa en
-- src/lib/validators.ts). No hay columna "tipo": se deduce del RUT, que ya no se
-- puede cambiar una vez ingresado.
--
-- En una cuenta de empresa full_name es la razón social (es lo que ven los demás en
-- las salas y el nombre de la cuenta bancaria), y la persona que la maneja queda como
-- representante legal. Para verificarla se piden el carnet y la selfie del
-- representante más un documento del SII que lo vincule a la empresa.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS representante_nombre text
    CHECK (representante_nombre IS NULL OR char_length(representante_nombre) <= 100),
  ADD COLUMN IF NOT EXISTS representante_rut text
    CHECK (representante_rut IS NULL OR char_length(representante_rut) <= 12),
  ADD COLUMN IF NOT EXISTS verification_company_doc_url text;

COMMENT ON COLUMN public.profiles.representante_nombre IS
  'Cuentas de empresa: nombre del representante legal. full_name es la razón social.';
COMMENT ON COLUMN public.profiles.representante_rut IS
  'Cuentas de empresa: RUT del representante legal (persona natural).';
COMMENT ON COLUMN public.profiles.verification_company_doc_url IS
  'Cuentas de empresa: ruta en verification-documents del e-RUT o carpeta tributaria del SII.';

-- El documento del SII suele bajarse en PDF.
UPDATE storage.buckets
   SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']
 WHERE id = 'verification-documents';

-- Igual que antes, más: el RUT del representante se ingresa una vez, y verificada la
-- cuenta tampoco cambia su nombre.
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_admin_or_service() THEN
    RETURN NEW;
  END IF;
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    RAISE EXCEPTION 'No autorizado a modificar is_verified';
  END IF;
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF NOT (
      (OLD.verification_status IS NULL OR OLD.verification_status = '' OR OLD.verification_status = 'pending' OR OLD.verification_status = 'rejected')
      AND NEW.verification_status = 'in_review'
    ) THEN
      RAISE EXCEPTION 'No autorizado a modificar verification_status';
    END IF;
  END IF;
  IF COALESCE(NEW.verification_result_email_status, '') IS DISTINCT FROM COALESCE(OLD.verification_result_email_status, '') THEN
    RAISE EXCEPTION 'No autorizado a modificar verification_result_email_status';
  END IF;
  IF NEW.verification_result_email_sent_at IS DISTINCT FROM OLD.verification_result_email_sent_at THEN
    RAISE EXCEPTION 'No autorizado a modificar verification_result_email_sent_at';
  END IF;
  IF COALESCE(NEW.verification_result_email_key, '') IS DISTINCT FROM COALESCE(OLD.verification_result_email_key, '') THEN
    RAISE EXCEPTION 'No autorizado a modificar verification_result_email_key';
  END IF;
  IF NEW.reputation_score IS DISTINCT FROM OLD.reputation_score THEN
    RAISE EXCEPTION 'No autorizado a modificar reputation_score';
  END IF;
  IF NEW.total_transactions IS DISTINCT FROM OLD.total_transactions THEN
    RAISE EXCEPTION 'No autorizado a modificar total_transactions';
  END IF;
  -- El RUT se ingresa una vez (la app ya lo bloquea). Si se pudiera cambiar,
  -- quien robe una cuenta pondría su RUT y su banco y retiraría la plata.
  IF coalesce(trim(OLD.rut), '') <> '' AND NEW.rut IS DISTINCT FROM OLD.rut THEN
    RAISE EXCEPTION 'El RUT no se puede cambiar. Si hay un error, escríbenos a contacto@trado.cl';
  END IF;
  IF coalesce(trim(OLD.representante_rut), '') <> '' AND NEW.representante_rut IS DISTINCT FROM OLD.representante_rut THEN
    RAISE EXCEPTION 'El RUT del representante legal no se puede cambiar. Si hay un error, escríbenos a contacto@trado.cl';
  END IF;
  -- Verificado, el nombre queda atado al documento.
  IF OLD.is_verified AND NEW.full_name IS DISTINCT FROM OLD.full_name THEN
    RAISE EXCEPTION 'Tu nombre quedó verificado con tu documento y no se puede cambiar';
  END IF;
  IF OLD.is_verified AND NEW.representante_nombre IS DISTINCT FROM OLD.representante_nombre THEN
    RAISE EXCEPTION 'El representante legal quedó verificado y no se puede cambiar';
  END IF;
  RETURN NEW;
END;
$function$;
