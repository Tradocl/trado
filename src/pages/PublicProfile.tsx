import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { UserRatings } from "@/components/UserRatings";
import { Logo } from "@/components/Logo";
import { ArrowLeft, Star, ShieldCheck, AlertTriangle, Package, Share2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

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

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: `Perfil de ${profile?.full_name} en Trado`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Enlace copiado al portapapeles");
    }
  };

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
  const reputationLabel =
    (profile.reputation_score ?? 0) >= 4.5 ? "Excelente" :
    (profile.reputation_score ?? 0) >= 3.5 ? "Muy bueno" :
    (profile.reputation_score ?? 0) >= 2.5 ? "Bueno" :
    (profile.reputation_score ?? 0) >= 1.5 ? "Regular" : "Nuevo";

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{`Perfil de ${profile.full_name} — Trado`}</title>
        <meta name="description" content={`Perfil público de ${profile.full_name} en Trado: reputación, calificaciones y verificación de identidad.`} />
        <link rel="canonical" href={`https://trado.cl/u/${profile.id}`} />
        <meta property="og:title" content={`${profile.full_name} en Trado`} />
        <meta property="og:url" content={`https://trado.cl/u/${profile.id}`} />
      </Helmet>
      {/* Hero gradient banner */}
      <div className="relative h-36 bg-gradient-to-br from-[#3340d8] via-[#4a3fd6] to-[#7147d4] overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute top-4 right-16 w-20 h-20 rounded-full bg-white/5" />

        {/* Top nav */}
        <div className="relative z-10 flex items-center justify-between px-4 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Volver
          </Button>
          <div className="flex items-center gap-1.5">
            <Logo variant="white" height={22} />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            aria-label="Compartir perfil"
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Avatar — overlaps banner */}
      <div className="max-w-lg mx-auto px-4">
        <div className="-mt-12 mb-4 flex items-end justify-between">
          <Avatar className="h-24 w-24 border-4 border-background shadow-xl ring-2 ring-primary/20">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-[#7147d4] text-white font-bold text-2xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          {profile.is_verified && (
            <div className="mb-2 flex items-center gap-1.5 bg-success/10 border border-success/30 text-success text-xs font-medium px-3 py-1.5 rounded-full">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Verificado
            </div>
          )}
        </div>

        {/* Name & nickname */}
        <div className="mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{profile.full_name}</h1>
            {!profile.is_verified && (
              <Badge className="bg-warning/10 text-warning border-warning/30 text-xs" variant="outline">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Sin verificar
              </Badge>
            )}
          </div>
          {profile.nickname && (
            <p className="text-sm text-muted-foreground mt-0.5">@{profile.nickname}</p>
          )}
        </div>

        {/* Stars inline */}
        <div className="flex items-center gap-2 mb-5">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`h-4 w-4 ${s <= reputationStars ? "text-warning fill-warning" : "text-muted-foreground/30"}`}
              />
            ))}
          </div>
          <span className="text-sm font-semibold">{(profile.reputation_score ?? 0).toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">· {reputationLabel}</span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <Card className="border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none">{profile.total_transactions ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Transacciones</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                <Star className="h-5 w-5 text-warning fill-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none">{(profile.reputation_score ?? 0).toFixed(1)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Reputación</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trust section */}
        <Card className="mb-5 border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Confianza y seguridad</p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className={`h-2 w-2 rounded-full flex-shrink-0 ${profile.is_verified ? "bg-success" : "bg-muted-foreground/40"}`} />
                <span className={`text-sm ${profile.is_verified ? "text-foreground" : "text-muted-foreground"}`}>
                  Identidad verificada
                </span>
                {profile.is_verified && <ShieldCheck className="h-3.5 w-3.5 text-success ml-auto" />}
              </div>
              <div className="flex items-center gap-2.5">
                <div className={`h-2 w-2 rounded-full flex-shrink-0 ${(profile.total_transactions ?? 0) > 0 ? "bg-success" : "bg-muted-foreground/40"}`} />
                <span className={`text-sm ${(profile.total_transactions ?? 0) > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                  Historial de transacciones
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className={`h-2 w-2 rounded-full flex-shrink-0 ${(profile.reputation_score ?? 0) >= 4 ? "bg-success" : "bg-muted-foreground/40"}`} />
                <span className={`text-sm ${(profile.reputation_score ?? 0) >= 4 ? "text-foreground" : "text-muted-foreground"}`}>
                  Reputación alta (≥ 4.0)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ratings */}
        <Card className="mb-8 border-border/60">
          <CardHeader className="pb-2">
            <h2 className="text-base font-semibold leading-none tracking-tight">Calificaciones recibidas</h2>
          </CardHeader>
          <Separator />
          <CardContent className="pt-3">
            <UserRatings userId={profile.id} maxRatings={10} />
          </CardContent>
        </Card>

        {/* Footer brand */}
        <div className="flex items-center justify-center gap-2 pb-8 text-muted-foreground/50">
          <Logo height={20} />
          <span className="text-xs">Perfil verificado por Trado</span>
        </div>
      </div>
    </div>
  );
};

export default PublicProfile;
