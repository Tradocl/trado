-- La tabla sala_fotos nació sin permisos: en este proyecto las tablas nuevas no
-- heredan grants (ver 20260619000000_grant_table_access.sql). Sin esto, RLS ni
-- siquiera llega a evaluarse y todo usuario recibe "permission denied".
-- Solo authenticated (anon no tiene nada que hacer aquí) y service_role.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sala_fotos TO authenticated;
GRANT ALL ON public.sala_fotos TO service_role;
