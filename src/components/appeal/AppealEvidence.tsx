import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Image as ImageIcon, Video, Download, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";

interface AppealEvidenceProps {
  appealId: string;
  currentUserId: string;
  appealStatus: string;
}

export function AppealEvidence({ appealId, currentUserId, appealStatus }: AppealEvidenceProps) {
  const [evidence, setEvidence] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchEvidence();

    const channel = supabase
      .channel(`appeal-evidence-${appealId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "appeal_evidence",
          filter: `appeal_id=eq.${appealId}`,
        },
        () => fetchEvidence()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appealId]);

  const fetchEvidence = async () => {
    try {
      const { data, error } = await supabase
        .from("appeal_evidence")
        .select("*")
        .eq("appeal_id", appealId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const evidenceData = (data as any[]) || [];
      const userIds = Array.from(new Set(evidenceData.map((item) => item.user_id).filter(Boolean)));

      let profilesMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds as string[]);

        if (!profilesError && profilesData) {
          profilesMap = new Map(profilesData.map((p: any) => [p.id, p.full_name]));
        }
      }

      const evidenceWithUsers = evidenceData.map((item) => ({
        ...item,
        user_name: profilesMap.get(item.user_id) || "Usuario",
      }));

      setEvidence(evidenceWithUsers);
    } catch (error: any) {
      console.error("Error fetching evidence:", error);
      toast.error("Error al cargar evidencias");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error("El archivo no puede superar los 20MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${currentUserId}/${Date.now()}.${fileExt}`;

      const filePath = `${appealId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from("appeal-evidence")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("appeal-evidence")
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from("appeal_evidence")
        .insert({
          appeal_id: appealId,
          user_id: currentUserId,
          file_url: publicUrl,
          file_type: file.type,
          file_name: file.name,
          comment: comment.trim() || null,
        });

      if (insertError) throw insertError;

      await fetchEvidence();

      toast.success("Evidencia subida correctamente");
      setComment("");
      e.target.value = "";
    } catch (error: any) {
      console.error("Error uploading evidence:", error);
      toast.error("Error al subir la evidencia");
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <ImageIcon className="h-5 w-5" />;
    if (fileType.startsWith("video/")) return <Video className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
  };

  const renderPreview = (item: any) => {
    if (item.file_type.startsWith("image/")) {
      return (
        <img
          src={item.file_url}
          alt={item.file_name}
          className="w-full h-48 object-cover rounded-lg"
        />
      );
    }
    if (item.file_type.startsWith("video/")) {
      return (
        <video
          src={item.file_url}
          controls
          className="w-full h-48 rounded-lg"
        />
      );
    }
    return (
      <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
        {getFileIcon(item.file_type)}
        <span className="ml-2 text-sm">{item.file_name}</span>
      </div>
    );
  };

  const handleSubmitForReview = async () => {
    if (evidence.length === 0) {
      toast.error("Debes subir al menos una evidencia antes de enviar a revisión");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("appeals")
        .update({
          status: "en_revision_plataforma",
        })
        .eq("id", appealId);

      if (error) throw error;
      toast.success("Apelación enviada a revisión de administradores");
    } catch (error: any) {
      console.error("Error submitting for review:", error);
      toast.error("Error al enviar la apelación a revisión");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmitForReview = ["apelacion_abierta", "en_negociacion"].includes(appealStatus);

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="font-semibold">Subir nueva evidencia</h3>
        
        <div className="space-y-2">
          <Label htmlFor="evidence-comment">Comentario (opcional)</Label>
          <Textarea
            id="evidence-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Describe qué muestra este archivo..."
            className="min-h-[80px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="evidence-file">Archivo</Label>
          <Input
            id="evidence-file"
            type="file"
            onChange={handleFileUpload}
            disabled={uploading}
            accept="image/*,video/*,application/pdf,.doc,.docx"
          />
          <p className="text-xs text-muted-foreground">
            Máximo 20MB. Formatos: imágenes, videos, PDF, documentos.
          </p>
        </div>

        {uploading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            Subiendo archivo...
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">
          Evidencia subida ({evidence.length})
        </h3>

        {evidence.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay evidencia subida aún.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {evidence.map((item) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-3">
                {renderPreview(item)}
                
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Por {item.user_name || "Usuario"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className="shrink-0"
                    >
                      <a href={item.file_url} download target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                  
                  {item.comment && (
                    <p className="text-sm text-muted-foreground">
                      {item.comment}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {canSubmitForReview && (
        <>
          <Separator className="my-6" />
          <div className="bg-gradient-to-r from-primary/5 to-accent/5 border rounded-lg p-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">¿Listo para enviar a revisión?</h3>
                <p className="text-sm text-muted-foreground">
                  Una vez que envíes el caso a revisión, un administrador revisará toda la evidencia y conversaciones 
                  para tomar una decisión justa. Asegúrate de haber subido toda la evidencia necesaria antes de enviar.
                </p>
              </div>
              
              <Button 
                onClick={handleSubmitForReview}
                disabled={submitting || evidence.length === 0}
                className="w-full"
                size="lg"
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar a Revisión de Administradores
                  </>
                )}
              </Button>

              {evidence.length === 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Debes subir al menos una evidencia para poder enviar a revisión
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}