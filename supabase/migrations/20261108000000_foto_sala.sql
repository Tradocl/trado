-- Foto opcional del producto en la sala.
-- Una foto por sala, en una tabla aparte para no tocar transactions ni su trigger
-- anti-manipulación. La sube solo quien vende; la ven las dos partes y el admin.

CREATE TABLE IF NOT EXISTS public.sala_fotos (
  transaction_id uuid PRIMARY KEY REFERENCES public.transactions(id) ON DELETE CASCADE,
  path text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sala_fotos ENABLE ROW LEVEL SECURITY;

-- Quien vende de verdad: seller_id, salvo cuando la creó un comprador y nadie se ha unido
-- (en ese momento el comprador todavía ocupa seller_id).
CREATE OR REPLACE FUNCTION public.es_vendedor_de_sala(_tx text, _uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id::text = _tx
      AND t.seller_id = _uid
      AND NOT (t.initiator_role = 'buyer' AND t.buyer_id IS NULL)
      -- Solo antes de entregar: después la foto sirve de registro y no se cambia
      AND t.state IN ('created', 'funds_secured')
  );
$$;

CREATE OR REPLACE FUNCTION public.participa_en_sala(_tx text, _uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id::text = _tx AND (t.seller_id = _uid OR t.buyer_id = _uid)
  );
$$;

REVOKE ALL ON FUNCTION public.es_vendedor_de_sala(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.participa_en_sala(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.es_vendedor_de_sala(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.participa_en_sala(text, uuid) TO authenticated;

DROP POLICY IF EXISTS "Participantes ven la foto de la sala" ON public.sala_fotos;
CREATE POLICY "Participantes ven la foto de la sala" ON public.sala_fotos
  FOR SELECT TO authenticated
  USING (public.participa_en_sala(transaction_id::text, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "El vendedor pone la foto" ON public.sala_fotos;
CREATE POLICY "El vendedor pone la foto" ON public.sala_fotos
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND public.es_vendedor_de_sala(transaction_id::text, auth.uid()));

DROP POLICY IF EXISTS "El vendedor cambia la foto" ON public.sala_fotos;
CREATE POLICY "El vendedor cambia la foto" ON public.sala_fotos
  FOR UPDATE TO authenticated
  USING (public.es_vendedor_de_sala(transaction_id::text, auth.uid()))
  WITH CHECK (uploaded_by = auth.uid() AND public.es_vendedor_de_sala(transaction_id::text, auth.uid()));

DROP POLICY IF EXISTS "El vendedor quita la foto" ON public.sala_fotos;
CREATE POLICY "El vendedor quita la foto" ON public.sala_fotos
  FOR DELETE TO authenticated
  USING (public.es_vendedor_de_sala(transaction_id::text, auth.uid()));

-- Bucket privado: <transaction_id>/<archivo>. Solo imágenes, hasta 5 MB.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('sala-fotos', 'sala-fotos', false, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Participantes ven fotos de sala" ON storage.objects;
CREATE POLICY "Participantes ven fotos de sala" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'sala-fotos'
    AND (
      public.participa_en_sala((storage.foldername(name))[1], auth.uid())
      OR public.has_role(auth.uid(), 'admin')
    )
  );

DROP POLICY IF EXISTS "El vendedor sube la foto de sala" ON storage.objects;
CREATE POLICY "El vendedor sube la foto de sala" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'sala-fotos'
    AND public.es_vendedor_de_sala((storage.foldername(name))[1], auth.uid())
  );

DROP POLICY IF EXISTS "El vendedor borra la foto de sala" ON storage.objects;
CREATE POLICY "El vendedor borra la foto de sala" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'sala-fotos'
    AND public.es_vendedor_de_sala((storage.foldername(name))[1], auth.uid())
  );
