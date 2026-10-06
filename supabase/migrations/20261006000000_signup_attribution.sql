-- ============================================================================
-- De qué anuncio vino cada cuenta nueva
-- ============================================================================
--
-- La campaña de Meta de octubre 2026 gastó $32.000 y sólo se sabía "2 cuentas
-- en total". Cada anuncio lleva su utm_content; src/lib/attribution.ts lo
-- recuerda al llegar y lo guarda acá cuando la persona crea su cuenta.
--
-- Cada usuario puede escribir sólo SU fila, una vez (PK = user_id) y sin poder
-- cambiarla después. Leerla es sólo para admins con 2FA.

CREATE TABLE IF NOT EXISTS public.signup_attribution (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  utm_source   text CHECK (char_length(utm_source)   <= 120),
  utm_medium   text CHECK (char_length(utm_medium)   <= 120),
  utm_campaign text CHECK (char_length(utm_campaign) <= 120),
  utm_content  text CHECK (char_length(utm_content)  <= 120),
  landing      text CHECK (char_length(landing)      <= 200),
  via          text CHECK (char_length(via)          <= 40),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.signup_attribution ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cada usuario registra su propio origen" ON public.signup_attribution;
CREATE POLICY "Cada usuario registra su propio origen" ON public.signup_attribution
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins con 2FA leen el origen" ON public.signup_attribution;
CREATE POLICY "Admins con 2FA leen el origen" ON public.signup_attribution
  FOR SELECT TO authenticated
  USING (public.is_admin_mfa());

REVOKE ALL ON public.signup_attribution FROM anon;
GRANT INSERT, SELECT ON public.signup_attribution TO authenticated;
GRANT ALL ON public.signup_attribution TO service_role;

COMMENT ON TABLE public.signup_attribution IS
  'Origen (utm del anuncio) de cada cuenta nueva. Lo escribe el frontend al registrarse; lo leen admins con 2FA.';
