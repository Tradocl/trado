import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Star, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface Rating {
  id: string;
  stars: number;
  comment: string;
  created_at: string;
  rater: {
    full_name: string;
  };
}

interface UserRatingsProps {
  userId: string;
  maxRatings?: number;
}

export const UserRatings = ({ userId, maxRatings = 3 }: UserRatingsProps) => {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRatings();
  }, [userId]);

  const loadRatings = async () => {
    try {
      const { data, error } = await supabase
        .from("ratings")
        .select(`
          id,
          stars,
          comment,
          created_at,
          rater:profiles!rater_id (
            full_name
          )
        `)
        .eq("rated_id", userId)
        .order("created_at", { ascending: false })
        .limit(maxRatings);

      if (error) throw error;
      setRatings(data || []);
    } catch (error) {
      console.error("Error loading ratings:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-4 space-y-2">
        <div className="h-16 bg-muted/50 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  if (ratings.length === 0) {
    return (
      <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-border/50">
        <p className="text-sm text-muted-foreground text-center">
          Sin calificaciones aún
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2 sm:mt-4 space-y-2 sm:space-y-3">
      <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground">
        <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
        <span>Calificaciones recientes</span>
      </div>
      {ratings.map((rating) => (
        <div
          key={rating.id}
          className="p-2 sm:p-3 bg-background/50 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
        >
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <div className="flex items-center gap-0.5 sm:gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${
                    i < rating.stars
                      ? "text-warning fill-warning"
                      : "text-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(rating.created_at), {
                addSuffix: true,
                locale: es,
              })}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-foreground/90 line-clamp-2 mb-0.5 sm:mb-1">
            "{rating.comment}"
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            por {rating.rater?.full_name || "Usuario"}
          </p>
        </div>
      ))}
    </div>
  );
};
