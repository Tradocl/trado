import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Image as ImageIcon, Video, Download, Send, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";

interface AppealEvidenceProps {
  appealId: string;
  currentUserId: string;
  appealStatus: string;
  isAdmin?: boolean;
}

interface PendingFile {
  file: File;
  preview: string | null;
}

export function AppealEvidence({ appealId, currentUserId, appealStatus, isAdmin = false }: AppealEvidenceProps) {
  const [evidence, setEvidence] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

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
      // Clean up previews on unmount
      pendingFiles.forEach(pf => {
        if (pf.preview) URL.revokeObjectURL(pf.preview);
      });
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

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles: PendingFile[] = [];
    
    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} supera los 20MB y no será incluido`);
        continue;
      }
      
      const preview = file.type.startsWith("image/") 
        ? URL.createObjectURL(file) 
        : null;
      
      validFiles.push({ file, preview });
    }

    setPendingFiles(prev => [...prev, ...validFiles]);
    e.target.value = "";
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => {
      const removed = prev[index];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUploadAll = async () => {
    if (pendingFiles.length === 0) {
      toast.error("Selecciona al menos un archivo para subir");
      return;
    }

    setUploading(true);
    let successCount = 0;

    try {
      for (const { file } of pendingFiles) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${currentUserId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `${appealId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("appeal-evidence")
          .upload(filePath, file);

        if (uploadError) {
          console.error(`Error uploading ${file.name}:`, uploadError);
          continue;
        }

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
            comment: successCount === 0 && comment.trim() ? comment.trim() : null,
          });

        if (!insertError) {
          successCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} archivo(s) subido(s) correctamente`);
        // Clean up previews
        pendingFiles.forEach(pf => {
          if (pf.preview) URL.revokeObjectURL(pf.preview);
        });
        setPendingFiles([]);
        setComment("");
        await fetchEvidence();
      } else {
        toast.error("No se pudo subir ningún archivo");
      }
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
  const isResolved = ["resuelta_a_favor_comprador", "resuelta_a_favor_vendedor", "resuelta_parcial", "cerrada"].includes(appealStatus);

  return (
    <div className="space-y-6">
      {!isResolved && !isAdmin && (
        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="font-semibold">Subir nueva evidencia</h3>
          
          <div className="space-y-2">
            <Label htmlFor="evidence-comment">Comentario (opcional)</Label>
            <Textarea
              id="evidence-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe qué muestran estos archivos..."
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-3">
            <Label>Archivos</Label>
            
            {/* Pending files preview */}
            {pendingFiles.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {pendingFiles.map((pf, index) => (
                  <div key={index} className="relative group">
                    {pf.preview ? (
                      <img 
                        src={pf.preview} 
                        alt={pf.file.name}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                    ) : (
                      <div className="w-full h-24 bg-muted rounded-lg border flex flex-col items-center justify-center p-2">
                        {getFileIcon(pf.file.type)}
                        <span className="text-xs text-muted-foreground truncate w-full text-center mt-1">
                          {pf.file.name}
                        </span>
                      </div>
                    )}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removePendingFile(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                
                {/* Add more button */}
                <label className="w-full h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mt-1">Agregar más</span>
                  <Input
                    type="file"
                    multiple
                    onChange={handleFilesSelected}
                    className="hidden"
                    accept="image/*,video/*,application/pdf,.doc,.docx"
                  />
                </label>
              </div>
            )}

            {/* Initial file selector */}
            {pendingFiles.length === 0 && (
              <label className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                <span className="text-sm font-medium">Haz clic para seleccionar archivos</span>
                <span className="text-xs text-muted-foreground mt-1">
                  Puedes seleccionar múltiples archivos a la vez
                </span>
                <Input
                  type="file"
                  multiple
                  onChange={handleFilesSelected}
                  className="hidden"
                  accept="image/*,video/*,application/pdf,.doc,.docx"
                />
              </label>
            )}
            
            <p className="text-xs text-muted-foreground">
              Máximo 20MB por archivo. Formatos: imágenes, videos, PDF, documentos.
            </p>
          </div>

          {pendingFiles.length > 0 && (
            <Button 
              onClick={handleUploadAll} 
              disabled={uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Subiendo {pendingFiles.length} archivo(s)...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Subir {pendingFiles.length} archivo(s)
                </>
              )}
            </Button>
          )}
        </div>
      )}

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

      {canSubmitForReview && !isAdmin && (
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
