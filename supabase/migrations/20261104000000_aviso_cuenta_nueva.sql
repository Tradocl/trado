-- ============================================================================
-- Aviso al dueño por cada cuenta nueva
-- ============================================================================
--
-- Al insertarse un perfil (lo crea handle_new_user al registrarse, con email o
-- con Google) se llama en segundo plano a la Edge Function notify-new-signup, que
-- manda el correo a ADMIN_ALERT_EMAIL. Va en la base y no en el navegador para que
-- llegue también con quien se registra por email y nunca confirma.
--
-- net.http_post es asíncrono: no demora el registro. Y si algo falla (vault sin
-- secretos, pg_net caído) se traga el error: un aviso nunca puede impedir que
-- alguien se cree la cuenta.

CREATE OR REPLACE FUNCTION public.notify_new_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
             || '/functions/v1/notify-new-signup',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body := jsonb_build_object('user_id', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_new_signup: no se pudo avisar de la cuenta %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_new_signup() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notify_new_signup_trg ON public.profiles;
CREATE TRIGGER notify_new_signup_trg
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_signup();
