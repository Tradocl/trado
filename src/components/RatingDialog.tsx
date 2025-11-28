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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Califica {isRatingSeller ? "al vendedor" : "al comprador"}
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Tu opinión ayuda a que más personas confíen en nuestra comunidad. 
            Califica tu experiencia con <span className="font-semibold">{ratedUserName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Stars */}
          <div className="space-y-3">
            <label className="text-sm font-medium">¿Cómo fue tu experiencia?</label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setStars(star)}
                  onMouseEnter={() => setHoveredStars(star)}
                  onMouseLeave={() => setHoveredStars(0)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={`h-10 w-10 ${
                      star <= (hoveredStars || stars)
                        ? "fill-warning text-warning"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
            {stars > 0 && (
              <p className="text-center text-sm text-muted-foreground">
                {stars === 1 && "Muy mala experiencia"}
                {stars === 2 && "Mala experiencia"}
                {stars === 3 && "Experiencia regular"}
                {stars === 4 && "Buena experiencia"}
                {stars === 5 && "¡Excelente experiencia!"}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Cuéntanos más sobre tu experiencia <span className="text-muted-foreground">(opcional)</span>
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe tu experiencia con este usuario (opcional)..."
              className="min-h-[100px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/500 caracteres
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || stars === 0}
            className="flex-1 bg-gradient-to-r from-warning to-warning/80"
          >
            {submitting ? "Enviando..." : "Enviar Calificación"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
