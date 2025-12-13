import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, CheckCircle, Clock, XCircle, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Verification = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSelfie, setSelectedSelfie] = useState<File | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      toast.error("Error al cargar perfil");
      return;
    }

    setProfile(data);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        toast.error("Solo se permiten imágenes");
        return;
      }
      
      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("La imagen debe ser menor a 5MB");
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleSelfieSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        toast.error("Solo se permiten imágenes");
        return;
      }
      
      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("La imagen debe ser menor a 5MB");
        return;
      }
      
      setSelectedSelfie(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedSelfie || !user) {
      toast.error("Debes subir tanto tu carnet como tu selfie con el carnet");
      return;
    }

    setUploading(true);

    try {
      // Subir documento de identidad
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/document-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('verification-documents')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Subir selfie
      const selfieExt = selectedSelfie.name.split('.').pop();
      const selfieName = `${user.id}/selfie-${Date.now()}.${selfieExt}`;
      
      const { error: selfieUploadError } = await supabase.storage
        .from('verification-documents')
        .upload(selfieName, selectedSelfie);

      if (selfieUploadError) throw selfieUploadError;

      // Obtener URLs públicas
      const { data: docUrlData } = supabase.storage
        .from('verification-documents')
        .getPublicUrl(fileName);

      const { data: selfieUrlData } = supabase.storage
        .from('verification-documents')
        .getPublicUrl(selfieName);

      // Actualizar perfil
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          verification_document_url: docUrlData.publicUrl,
          verification_selfie_url: selfieUrlData.publicUrl,
          verification_status: 'in_review',
          verification_submitted_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Notificar al admin
      try {
        await supabase.functions.invoke('notify-verification-submitted', {});
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
        // No mostramos error al usuario, el documento fue subido correctamente
      }

      toast.success("¡Documentos enviados! Tu verificación está en revisión.");
      fetchProfile();
      setSelectedFile(null);
      setSelectedSelfie(null);
    } catch (error: any) {
      toast.error(error.message || "Error al subir documentos");
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-success text-white">
            <CheckCircle className="w-4 h-4 mr-1" />
            Verificado
          </Badge>
        );
      case 'in_review':
        return (
          <Badge className="bg-info text-white">
            <Clock className="w-4 h-4 mr-1" />
            En Revisión
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="w-4 h-4 mr-1" />
            Rechazado
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="w-4 h-4 mr-1" />
            Pendiente
          </Badge>
        );
    }
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-4"
        >
          ← Volver al Dashboard
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Verificación de Identidad</CardTitle>
                  <CardDescription>
                    Sube tu cédula de identidad para aumentar tu reputación
                  </CardDescription>
                </div>
              </div>
              {getStatusBadge(profile.verification_status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {profile.verification_status === 'approved' ? (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">¡Identidad Verificada!</h3>
                <p className="text-muted-foreground">
                  Tu cuenta tiene el sello de verificación.
                </p>
              </div>
            ) : profile.verification_status === 'in_review' ? (
              <div className="text-center py-8">
                <Clock className="h-16 w-16 text-info mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">En Revisión</h3>
                <p className="text-muted-foreground">
                  Tu documento está siendo revisado por nuestro equipo.
                  Te notificaremos cuando se complete.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Instrucciones:</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Sube una foto clara de la parte frontal de tu cédula de identidad</li>
                      <li>Sube una selfie donde aparezcas sosteniendo tu carnet al lado de tu rostro</li>
                      <li>Asegúrate de que toda la información sea legible en ambas fotos</li>
                      <li>Cada archivo debe ser menor a 5MB</li>
                      <li>Formatos aceptados: JPG, PNG, WEBP</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="document">Documento de Identidad</Label>
                    <Input
                      id="document"
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      disabled={uploading}
                    />
                    {selectedFile && (
                      <p className="text-sm text-muted-foreground">
                        Archivo seleccionado: {selectedFile.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="selfie">Selfie con Carnet</Label>
                    <Input
                      id="selfie"
                      type="file"
                      accept="image/*"
                      onChange={handleSelfieSelect}
                      disabled={uploading}
                    />
                    {selectedSelfie && (
                      <p className="text-sm text-muted-foreground">
                        Archivo seleccionado: {selectedSelfie.name}
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || !selectedSelfie || uploading}
                    className="w-full"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploading ? "Subiendo..." : "Enviar para Verificación"}
                  </Button>
                </div>

                {profile.verification_status === 'rejected' && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <h4 className="font-semibold text-destructive mb-2">Verificación Rechazada</h4>
                    <p className="text-sm text-muted-foreground">
                      Tu documento fue rechazado. Por favor, asegúrate de que la imagen sea clara
                      y toda la información sea legible, luego intenta nuevamente.
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Verification;
