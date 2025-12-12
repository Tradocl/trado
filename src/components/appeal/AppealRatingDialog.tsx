import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Scale } from "lucide-react";
import { toast } from "sonner";

interface AppealRatingDialogProps {
  appealId: string;
  userId: string;
  isResolved: boolean;
}

export function AppealRatingDialog({ appealId, userId, isResolved }: AppealRatingDialogProps) {
  const [open, setOpen] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [stars, setStars] = useState(0);
  const [hoveredStars, setHoveredStars] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkIfRated();
  }, [appealId, userId]);

  const checkIfRated = async () => {
    try {
      const { data, error } = await supabase
        .from("appeal_ratings")
        .select("id")
        .eq("appeal_id", appealId)
        .eq("rater_id", userId)
        .maybeSingle();

      if (error) throw error;
      setHasRated(!!data);
    } catch (error: any) {
      console.error("Error checking rating:", error);
    }
  };

  const handleSubmit = async () => {
    if (stars === 0) {
      toast.error("Por favor selecciona una calificación");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("appeal_ratings")
        .insert({
          appeal_id: appealId,
          rater_id: userId,
          stars,
          comment: comment.trim() || null,
        });

      if (error) throw error;

      toast.success("Calificación enviada correctamente");
      setOpen(false);
      setHasRated(true);
    } catch (error: any) {
      console.error("Error submitting rating:", error);
      toast.error("Error al enviar la calificación");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isResolved || hasRated) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full transition-all duration-200 hover:scale-[1.01]">
          Calificar resolución
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-xl animate-pulse" />
          <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-warning/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>
        
        <DialogHeader className="relative animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
          {/* Animated icon */}
          <div className="mx-auto mb-4 relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
            <div className="relative w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg animate-scale-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
              <Scale className="w-8 h-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">Calificar la resolución</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4 relative">
          <div 
            className="space-y-2 animate-fade-in"
            style={{ animationDelay: '0.2s', animationFillMode: 'both' }}
          >
            <Label>Tu calificación</Label>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((value, index) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStars(value)}
                  onMouseEnter={() => setHoveredStars(value)}
                  onMouseLeave={() => setHoveredStars(0)}
                  className="transition-all duration-200 hover:scale-125 animate-scale-in"
                  style={{ animationDelay: `${0.1 * index + 0.3}s`, animationFillMode: 'both' }}
                >
                  <Star
                    className={`h-10 w-10 transition-colors duration-200 ${
                      value <= (hoveredStars || stars)
                        ? "fill-warning text-warning"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
            {stars > 0 && (
              <p className="text-center text-sm text-muted-foreground animate-fade-in">
                {stars === 1 && "Muy insatisfecho"}
                {stars === 2 && "Insatisfecho"}
                {stars === 3 && "Neutral"}
                {stars === 4 && "Satisfecho"}
                {stars === 5 && "¡Muy satisfecho!"}
              </p>
            )}
          </div>

          <div 
            className="space-y-2 animate-fade-in"
            style={{ animationDelay: '0.4s', animationFillMode: 'both' }}
          >
            <Label htmlFor="rating-comment">Comentario (opcional)</Label>
            <Textarea
              id="rating-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Comparte tu experiencia con la resolución..."
              className="min-h-[100px] transition-all duration-200 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={stars === 0 || submitting}
            className="w-full animate-fade-in transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/25"
            style={{ animationDelay: '0.5s', animationFillMode: 'both' }}
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Enviando...
              </>
            ) : (
              "Enviar calificación"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}