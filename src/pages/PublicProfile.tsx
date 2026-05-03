import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserRatings } from "@/components/UserRatings";
import { ArrowLeft, Star, ShieldCheck, AlertTriangle, Package } from "lucide-react";

interface PublicProfile {
  id: string;
  full_name: string;
  nickname: string | null;
  avatar_url: string | null;
  reputation_score: number;
  total_transactions: number;
  is_verified: boolean;
}

const PublicProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const { data, error } = await supabase
        .rpc("get_safe_profile", { profile_id: userId })
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setProfile(data as PublicProfile);
      }
      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Perfil no encontrado</p>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
      </div>
    );
  }

  const initials = profile.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  const reputationStars = Math.round(profile.reputation_score ?? 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>

        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold truncate">{profile.full_name}</h1>
                  {profile.is_verified ? (
                    <Badge className="bg-success/10 text-success border-success/30 text-xs" variant="outline">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      Verificado
                    </Badge>
                  ) : (
                    <Badge className="bg-warning/10 text-warning border-warning/30 text-xs" variant="outline">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Sin verificar
                    </Badge>
                  )}
                </div>
                {profile.nickname && (
                  <p className="text-sm text-muted-foreground">@{profile.nickname}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-4 w-4 ${s <= reputationStars ? "text-warning fill-warning" : "text-muted-foreground"}`}
                    />
                  ))}
                </div>
                <p className="text-lg font-bold">{(profile.reputation_score ?? 0).toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Reputación</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <p className="text-lg font-bold">{profile.total_transactions ?? 0}</p>
                <p className="text-xs text-muted-foreground">Transacciones</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Calificaciones recibidas</CardTitle>
          </CardHeader>
          <CardContent>
            <UserRatings userId={profile.id} maxRatings={10} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicProfile;
