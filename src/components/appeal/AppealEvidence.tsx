import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Image as ImageIcon, Video, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AppealEvidenceProps {
  appealId: string;
  currentUserId: string;
}

export function AppealEvidence({ appealId, currentUserId }: AppealEvidenceProps) {
  const [evidence, setEvidence] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [comment, setComment] = useState("");

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
        .select(`
          *,
          user:profiles(full_name)
        `)
        .eq("appeal_id", appealId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Refresh signed URLs if needed
      const evidenceWithFreshUrls = await Promise.all(
        (data || []).map(async (item) => {
          // Check if URL is expired or about to expire
          try {
            const response = await fetch(item.file_url, { method: 'HEAD' });
            if (!response.ok) {
              // URL expired, generate new signed URL
              const filePath = item.file_url.split('/').slice(-2).join('/');
              const { data: urlData } = await supabase.storage
                .from("appeal-evidence")
                .createSignedUrl(filePath, 31536000);
              
              if (urlData) {
                // Update the URL in the database
                await supabase
                  .from("appeal_evidence")
                  .update({ file_url: urlData.signedUrl })
                  .eq("id", item.id);
                
                return { ...item, file_url: urlData.signedUrl };
              }
            }
          } catch (e) {
            // Ignore fetch errors, use existing URL
          }
          return item;
        })
      );
      
      setEvidence(evidenceWithFreshUrls);
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

      const { data: urlData, error: urlError } = await supabase.storage
        .from("appeal-evidence")
        .createSignedUrl(filePath, 31536000); // 1 year

      if (urlError) throw urlError;

      const { error: insertError } = await supabase
        .from("appeal_evidence")
        .insert({
          appeal_id: appealId,
          user_id: currentUserId,
          file_url: urlData.signedUrl,
          file_type: file.type,
          file_name: file.name,
          comment: comment.trim() || null,
        });

      if (insertError) throw insertError;

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
                        Por {item.user?.full_name || "Usuario"}
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
    </div>
  );
}