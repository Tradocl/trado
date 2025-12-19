import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  ShieldAlert, 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Download, 
  Send, 
  X, 
  Plus,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface EscalationPanelProps {
  appealId: string;
  currentUserId: string;
  appealStatus: string;
  onRefresh: () => void;
}

interface PendingFile {
  file: File;
  preview: string | null;
}

interface Evidence {
  id: string;
  file_url: string;
  file_type: string;
  file_name: string;
  comment: string | null;
  created_at: string;
  user_id: string;
  user_name?: string;
}

export function EscalationPanel({ 
  appealId, 
  currentUserId, 
  appealStatus,
  onRefresh 
}: EscalationPanelProps) {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [comment, setComment] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvidence();

    const channel = supabase
      .channel(`escalation-evidence-${appealId}`)
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

      const evidenceData = (data as Evidence[]) || [];
      const userIds = Array.from(new Set(evidenceData.map((item) => item.user_id).filter(Boolean)));

      let profilesMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        if (profilesData) {
          profilesMap = new Map(profilesData.map((p: any) => [p.id, p.full_name]));
        }
      }

      const evidenceWithUsers = evidenceData.map((item) => ({
        ...item,
        user_name: profilesMap.get(item.user_id) || "Usuario",
      }));

      setEvidence(evidenceWithUsers);
    } catch (error) {
      console.error("Error fetching evidence:", error);
    } finally {
      setLoading(false);
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

  const handleUploadFiles = async () => {
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
        pendingFiles.forEach(pf => {
          if (pf.preview) URL.revokeObjectURL(pf.preview);
        });
        setPendingFiles([]);
        setComment("");
        await fetchEvidence();
      } else {
        toast.error("No se pudo subir ningún archivo");
      }
    } catch (error) {
      console.error("Error uploading evidence:", error);
      toast.error("Error al subir la evidencia");
    } finally {
      setUploading(false);
    }
  };

  const handleEscalate = async () => {
    if (evidence.length === 0) {
      toast.error("Debes subir al menos una evidencia antes de escalar");
      return;
    }

    setEscalating(true);
    try {
      // Get transaction ID from appeal
      const { data: appealData } = await supabase
        .from("appeals")
        .select("transaction_id")
        .eq("id", appealId)
        .single();

      const { error } = await supabase
        .from("appeals")
        .update({
          status: "pendiente_intervencion_plataforma",
          escalated_at: new Date().toISOString(),
          reason_description: additionalNotes.trim() 
            ? `${additionalNotes.trim()}` 
            : undefined,
        })
        .eq("id", appealId);

      if (error) throw error;

      // Send notification to the other party
      if (appealData?.transaction_id) {
        try {
          await supabase.functions.invoke("notify-transaction-action", {
            body: {
              transactionId: appealData.transaction_id,
              actionType: "appeal_escalated",
              actorId: currentUserId,
              additionalData: { appealId },
            },
          });
        } catch (notifyError) {
          console.error("Error sending notification:", notifyError);
        }
      }
      
      toast.success("Caso enviado a revisión de administradores");
      onRefresh();
    } catch (error) {
      console.error("Error escalating:", error);
      toast.error("Error al enviar el caso a revisión");
    } finally {
      setEscalating(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <ImageIcon className="h-5 w-5" />;
    if (fileType.startsWith("video/")) return <Video className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
  };

  const myEvidence = evidence.filter(e => e.user_id === currentUserId);
  const otherEvidence = evidence.filter(e => e.user_id !== currentUserId);

  // Check if already escalated (intervention requested)
  const isAlreadyEscalated = appealStatus === "pendiente_intervencion_plataforma" || appealStatus === "en_revision_plataforma";

  return (
    <Card className="border-2 shadow-lg border-amber-200 dark:border-amber-800">
      <CardHeader className="bg-gradient-to-r from-amber-500/10 to-orange-500/10">
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          {isAlreadyEscalated ? "Sube tu Evidencia" : "Enviar Caso a Administradores"}
        </CardTitle>
        <CardDescription>
          {isAlreadyEscalated 
            ? "El administrador revisará tu caso. Sube la evidencia que tengas para apoyar tu reclamo."
            : "Sube tu evidencia y envía el caso para revisión imparcial"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Step 1: Upload Evidence */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-sm font-bold text-amber-700 dark:text-amber-300">
              1
            </div>
            <h3 className="font-semibold">Sube tu evidencia</h3>
          </div>

          <div className="space-y-3 pl-10">
            <div className="space-y-2">
              <Label>Comentario para los archivos (opcional)</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Describe qué muestran estos archivos..."
                rows={2}
              />
            </div>

            {/* Pending files preview */}
            {pendingFiles.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {pendingFiles.map((pf, index) => (
                  <div key={index} className="relative group">
                    {pf.preview ? (
                      <img 
                        src={pf.preview} 
                        alt={pf.file.name}
                        className="w-full h-20 object-cover rounded-lg border"
                      />
                    ) : (
                      <div className="w-full h-20 bg-muted rounded-lg border flex flex-col items-center justify-center p-2">
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
                
                <label className="w-full h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                  <Plus className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Más</span>
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

            {pendingFiles.length === 0 && (
              <label className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm font-medium">Seleccionar archivos</span>
                <span className="text-xs text-muted-foreground mt-1">
                  Imágenes, videos, PDF, documentos (máx. 20MB)
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

            {pendingFiles.length > 0 && (
              <Button 
                onClick={handleUploadFiles} 
                disabled={uploading}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    Subiendo...
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
        </div>

        {/* Uploaded Evidence Summary */}
        {evidence.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Evidencia subida ({evidence.length} archivo{evidence.length > 1 ? "s" : ""})
            </div>
            
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {evidence.slice(0, 6).map((item) => (
                <div key={item.id} className="relative group">
                  {item.file_type.startsWith("image/") ? (
                    <img
                      src={item.file_url}
                      alt={item.file_name}
                      className="w-full h-12 object-cover rounded border"
                    />
                  ) : (
                    <div className="w-full h-12 bg-background rounded border flex items-center justify-center">
                      {getFileIcon(item.file_type)}
                    </div>
                  )}
                  <a
                    href={item.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded"
                  >
                    <Download className="h-4 w-4 text-white" />
                  </a>
                </div>
              ))}
              {evidence.length > 6 && (
                <div className="w-full h-12 bg-muted rounded border flex items-center justify-center text-xs text-muted-foreground">
                  +{evidence.length - 6} más
                </div>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Step 2: Additional Notes - Only show if not already escalated */}
        {!isAlreadyEscalated && (
          <>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-sm font-bold text-amber-700 dark:text-amber-300">
                  2
                </div>
                <h3 className="font-semibold">Describe tu caso (opcional)</h3>
              </div>

              <div className="pl-10">
                <Textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Proporciona cualquier información adicional que ayude al administrador a entender la situación..."
                  rows={3}
                />
              </div>
            </div>

            <Separator />

            {/* Step 3: Submit */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-sm font-bold text-amber-700 dark:text-amber-300">
                  3
                </div>
                <h3 className="font-semibold">Enviar a revisión</h3>
              </div>

              <div className="pl-10 space-y-4">
                {/* Warning */}
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Una vez enviado, un administrador revisará toda la evidencia y tomará una decisión final. 
                      Este proceso puede tomar hasta 48 horas.
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={handleEscalate}
                  disabled={escalating || evidence.length === 0}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                  size="lg"
                >
                  {escalating ? (
                    <>
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar Caso a Revisión
                    </>
                  )}
                </Button>

                {evidence.length === 0 && (
                  <p className="text-xs text-center text-muted-foreground">
                    Debes subir al menos una evidencia para poder enviar el caso
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Already escalated info */}
        {isAlreadyEscalated && (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">
                  Intervención solicitada
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Un administrador revisará tu caso pronto. Puedes seguir subiendo evidencia que apoye tu reclamo.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
