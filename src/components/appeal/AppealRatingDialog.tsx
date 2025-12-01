import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
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
        <Button variant="outline" className="w-full">
          Calificar resolución
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Calificar la resolución</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Tu calificación</Label>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStars(value)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-10 w-10 ${
                      value <= stars
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rating-comment">Comentario (opcional)</Label>
            <Textarea
              id="rating-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Comparte tu experiencia con la resolución..."
              className="min-h-[100px]"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={stars === 0 || submitting}
            className="w-full"
          >
            {submitting ? "Enviando..." : "Enviar calificación"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}