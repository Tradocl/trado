import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface RatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string;
  ratedUserId: string;
  ratedUserName: string;
  isRatingSeller: boolean;
  onRatingComplete: () => void;
}

export const RatingDialog = ({
  open,
  onOpenChange,
  transactionId,
  ratedUserId,
  ratedUserName,
  isRatingSeller,
  onRatingComplete,
}: RatingDialogProps) => {
  const [stars, setStars] = useState(0);
  const [hoveredStars, setHoveredStars] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (stars === 0) {
      toast.error("Por favor selecciona una calificación");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { error } = await supabase.from("ratings").insert({
        rater_id: user.id,
        rated_id: ratedUserId,
        transaction_id: transactionId,
        stars: stars,
        comment: comment.trim(),
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("Ya has calificado esta transacción");
        } else {
          throw error;
        }
        return;
      }

      toast.success("¡Calificación enviada exitosamente!");
      onOpenChange(false);
      onRatingComplete();
      setStars(0);
      setComment("");
    } catch (error: any) {
      console.error("Error submitting rating:", error);
      toast.error("Error al enviar calificación: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-warning/10 rounded-full blur-xl animate-pulse" />
          <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-primary/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>
        
        <DialogHeader className="relative animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
          {/* Animated icon */}
          <div className="mx-auto mb-4 relative">
            <div className="absolute inset-0 bg-warning/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
            <div className="relative w-16 h-16 bg-gradient-to-br from-warning to-warning/80 rounded-full flex items-center justify-center shadow-lg animate-scale-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
              <Star className="w-8 h-8 text-white fill-white" />
            </div>
          </div>
          <DialogTitle className="text-2xl text-center">
            Califica {isRatingSeller ? "al vendedor" : "al comprador"}
          </DialogTitle>
          <DialogDescription className="text-base pt-2 text-center">
            Tu opinión ayuda a que más personas confíen en nuestra comunidad. 
            Califica tu experiencia con <span className="font-semibold">{ratedUserName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 relative">
          {/* Stars */}
          <div 
            className="space-y-3 animate-fade-in"
            style={{ animationDelay: '0.2s', animationFillMode: 'both' }}
          >
            <label className="text-sm font-medium">¿Cómo fue tu experiencia?</label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star, index) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setStars(star)}
                  onMouseEnter={() => setHoveredStars(star)}
                  onMouseLeave={() => setHoveredStars(0)}
                  className="transition-all duration-200 hover:scale-125 focus:outline-none animate-scale-in"
                  style={{ animationDelay: `${0.1 * index + 0.3}s`, animationFillMode: 'both' }}
                >
                  <Star
                    className={`h-10 w-10 transition-colors duration-200 ${
                      star <= (hoveredStars || stars)
                        ? "fill-warning text-warning"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
            {stars > 0 && (
              <p className="text-center text-sm text-muted-foreground animate-fade-in">
                {stars === 1 && "Muy mala experiencia"}
                {stars === 2 && "Mala experiencia"}
                {stars === 3 && "Experiencia regular"}
                {stars === 4 && "Buena experiencia"}
                {stars === 5 && "¡Excelente experiencia!"}
              </p>
            )}
          </div>

          {/* Comment */}
          <div 
            className="space-y-2 animate-fade-in"
            style={{ animationDelay: '0.4s', animationFillMode: 'both' }}
          >
            <label className="text-sm font-medium">
              Cuéntanos más sobre tu experiencia <span className="text-muted-foreground">(opcional)</span>
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe tu experiencia con este usuario (opcional)..."
              className="min-h-[100px] resize-none transition-all duration-200 focus:ring-2 focus:ring-warning/20"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/500 caracteres
            </p>
          </div>
        </div>

        <div 
          className="flex gap-3 animate-fade-in"
          style={{ animationDelay: '0.5s', animationFillMode: 'both' }}
        >
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="flex-1 transition-all duration-200 hover:scale-[1.02]"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || stars === 0}
            className="flex-1 bg-gradient-to-r from-warning to-warning/80 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-warning/25"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Enviando...
              </>
            ) : (
              "Enviar Calificación"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};