-- profiles.total_transactions no lo mantiene nada (siempre 0), así que "Con quién tratas"
-- mostraba "Nuevo en Trado" y el perfil público "0 Transacciones" a gente con historial.
-- get_safe_profile ahora cuenta las salas completadas de verdad. Mismo control de acceso,
-- misma firma y mismas columnas: solo cambia de dónde sale total_transactions.
CREATE OR REPLACE FUNCTION public.get_safe_profile(profile_id uuid)
 RETURNS TABLE(id uuid, full_name text, nickname text, avatar_url text, reputation_score numeric, total_transactions integer, is_verified boolean, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Access control: Only allow if user has relationship with this profile
  IF NOT (
    -- User is viewing their own profile
    profile_id = auth.uid()
    -- Or user has a transaction with this profile (as buyer or seller)
    OR EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE (t.seller_id = auth.uid() AND t.buyer_id = profile_id)
         OR (t.buyer_id = auth.uid() AND t.seller_id = profile_id)
    )
    -- Or user is an admin
    OR has_role(auth.uid(), 'admin')
  ) THEN
    -- Return empty result set if no access
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.nickname,
    p.avatar_url,
    p.reputation_score,
    (
      SELECT count(*)::integer FROM public.transactions t
      WHERE t.state = 'completed' AND (t.seller_id = p.id OR t.buyer_id = p.id)
    ) AS total_transactions,
    p.is_verified,
    p.created_at
  FROM public.profiles p
  WHERE p.id = profile_id;
END;
$function$;
