-- Respuestas de los casos de estafa del stand del EtMday 2026 (/etm). Alimentan la
-- pantalla en vivo del stand (/etm/pantalla). Son anónimas: solo el caso, si acertó y
-- un identificador al azar del celular (para contar personas, no respuestas).
-- Cualquiera puede insertar (la página es pública), nadie puede leer las filas: el
-- resumen sale de etm_resumen(), que solo devuelve totales.
CREATE TABLE IF NOT EXISTS public.etm_respuestas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  caso text NOT NULL CHECK (caso ~ '^[a-z0-9-]{3,40}$'),
  acerto boolean NOT NULL,
  sesion uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS etm_respuestas_caso_idx ON public.etm_respuestas (caso);

ALTER TABLE public.etm_respuestas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cualquiera registra su respuesta" ON public.etm_respuestas;
CREATE POLICY "Cualquiera registra su respuesta" ON public.etm_respuestas
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Las tablas nuevas no heredan permisos en este proyecto (ver 20261108010000)
GRANT INSERT ON public.etm_respuestas TO anon, authenticated;
GRANT ALL ON public.etm_respuestas TO service_role;

CREATE OR REPLACE FUNCTION public.etm_resumen()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'personas', (SELECT count(DISTINCT sesion) FROM etm_respuestas),
    'respuestas', (SELECT count(*) FROM etm_respuestas),
    'aciertos', (SELECT count(*) FROM etm_respuestas WHERE acerto),
    'casos', COALESCE((
      SELECT json_agg(json_build_object('caso', caso, 'respuestas', n, 'aciertos', a) ORDER BY caso)
      FROM (SELECT caso, count(*) AS n, count(*) FILTER (WHERE acerto) AS a FROM etm_respuestas GROUP BY caso) x
    ), '[]'::json),
    'ultima', (SELECT max(created_at) FROM etm_respuestas)
  );
$$;

REVOKE ALL ON FUNCTION public.etm_resumen() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.etm_resumen() TO anon, authenticated;
