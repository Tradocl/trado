import { supabase } from "@/lib/supabase";

/**
 * Datos públicos de otras personas: nombre, apodo, avatar, reputación y sello.
 *
 * La fila completa de `profiles` (banco, RUT, dirección, teléfono, documentos)
 * sólo la lee su dueño o un admin. Para mostrar a la contraparte de una sala se
 * pasa por la RPC `get_profile_names`, que devuelve sólo lo que va en pantalla y
 * sólo de gente con la que compartes una transacción (o admins).
 */
export type PublicProfile = {
  id: string;
  full_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  reputation_score: number | null;
  is_verified: boolean | null;
};

export async function fetchProfileNames(
  ids: (string | null | undefined)[],
): Promise<Map<string, PublicProfile>> {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  const map = new Map<string, PublicProfile>();
  if (unique.length === 0) return map;

  const { data, error } = await supabase.rpc("get_profile_names", { p_ids: unique });
  if (error) {
    console.error("[profile-names] get_profile_names falló:", error);
    return map;
  }
  for (const p of (data ?? []) as PublicProfile[]) map.set(p.id, p);
  return map;
}
