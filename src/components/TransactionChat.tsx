import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle, Image as ImageIcon, X, Paperclip, FileText, Video } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  sender_name?: string;
  file_url?: string | null;
  file_type?: string | null;
  file_name?: string | null;
}

interface TransactionChatProps {
  transactionId: string;
  sellerId: string;
  sellerName: string;
  buyerId?: string;
  buyerName?: string;
}

export const TransactionChat = ({ transactionId, sellerId, sellerName, buyerId, buyerName }: TransactionChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat-${transactionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `transaction_id=eq.${transactionId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [transactionId]);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("transaction_id", transactionId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      setTimeout(scrollToBottom, 100);
    } catch (error: any) {
      console.error("Error loading messages:", error);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast.error("El archivo debe ser menor a 20MB");
      return;
    }

    // Validate file type
    const validTypes = [
      'image/', 'video/', 
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument',
      'text/plain', 'text/csv',
      'application/vnd.ms-excel'
    ];
    
    const isValid = validTypes.some(type => file.type.startsWith(type));
    if (!isValid) {
      toast.error("Tipo de archivo no soportado");
      return;
    }

    setSelectedFile(file);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadFile = async (): Promise<string | null> => {
    if (!selectedFile || !user) return null;

    setUploadingFile(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${transactionId}/${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('chat-files')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      toast.error("Error al subir archivo: " + error.message);
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const getFileType = (file: File): string => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type === 'application/pdf') return 'pdf';
    if (file.type.includes('word') || file.type.includes('document')) return 'document';
    if (file.type.includes('excel') || file.type.includes('spreadsheet')) return 'spreadsheet';
    if (file.type.startsWith('text/')) return 'text';
    return 'file';
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !user) return;

    setLoading(true);
    try {
      let fileUrl: string | null = null;
      let fileType: string | null = null;
      let fileName: string | null = null;

      // Upload file if selected
      if (selectedFile) {
        fileUrl = await uploadFile();
        if (!fileUrl && !newMessage.trim()) {
          // If file upload failed and there's no text message, don't send
          setLoading(false);
          return;
        }
        fileType = getFileType(selectedFile);
        fileName = selectedFile.name;
      }

      const { error } = await supabase.from("chat_messages").insert({
        transaction_id: transactionId,
        user_id: user.id,
        message: newMessage.trim() || (fileType === 'image' ? "(imagen)" : `(${fileName})`),
        file_url: fileUrl,
        file_type: fileType,
        file_name: fileName,
      });

      if (error) throw error;

      setNewMessage("");
      clearFile();
      scrollToBottom();
    } catch (error: any) {
      toast.error("Error al enviar mensaje: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getSenderName = (userId: string) => {
    if (userId === user?.id) {
      return "Tú";
    }
    if (userId === sellerId) {
      return sellerName;
    }
    if (userId === buyerId) {
      return buyerName || "Comprador";
    }
    return "Usuario";
  };

  return (
    <Card className="border-2 border-primary/20 shadow-xl">
      <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-accent/5">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          Chat de la Transacción
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea ref={scrollRef} className="h-[400px] p-4">
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay mensajes aún</p>
                <p className="text-xs">Envía el primer mensaje</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.user_id === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        isOwn
                          ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-xs font-semibold mb-1 opacity-70">
                        {getSenderName(msg.user_id)}
                      </p>
                      {msg.file_url && (
                        <>
                          {msg.file_type === 'image' && (
                            <img 
                              src={msg.file_url} 
                              alt="Imagen compartida"
                              className="rounded-lg max-w-full max-h-64 object-cover mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(msg.file_url!, '_blank')}
                            />
                          )}
                          {msg.file_type === 'video' && (
                            <video 
                              src={msg.file_url}
                              controls
                              className="rounded-lg max-w-full max-h-64 mb-2"
                            >
                              Tu navegador no soporta videos
                            </video>
                          )}
                          {msg.file_type && !['image', 'video'].includes(msg.file_type) && (
                            <a
                              href={msg.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-2 p-3 rounded-lg mb-2 ${
                                isOwn ? 'bg-primary-foreground/10' : 'bg-background/80'
                              } hover:opacity-80 transition-opacity`}
                            >
                              {msg.file_type === 'pdf' && <FileText className="h-5 w-5" />}
                              {['document', 'spreadsheet', 'text'].includes(msg.file_type) && <FileText className="h-5 w-5" />}
                              {!['pdf', 'document', 'spreadsheet', 'text'].includes(msg.file_type) && <Paperclip className="h-5 w-5" />}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{msg.file_name || 'Archivo'}</p>
                                <p className="text-xs opacity-60">Click para abrir</p>
                              </div>
                            </a>
                          )}
                        </>
                      )}
                      {msg.message && !msg.message.startsWith('(') && (
                        <p className="text-sm break-words">{msg.message}</p>
                      )}
                      <p className="text-xs opacity-60 mt-1">
                        {new Date(msg.created_at).toLocaleTimeString("es-CL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
        <form onSubmit={sendMessage} className="p-4 border-t bg-muted/30 space-y-3">
          {selectedFile && (
            <div className="relative inline-block">
              {filePreview ? (
                <img 
                  src={filePreview} 
                  alt="Vista previa" 
                  className="h-24 w-24 object-cover rounded-lg border-2 border-primary/30"
                />
              ) : (
                <div className="flex items-center gap-2 p-3 bg-background/80 rounded-lg border-2 border-primary/30">
                  {selectedFile.type.startsWith('video/') && <Video className="h-5 w-5" />}
                  {selectedFile.type === 'application/pdf' && <FileText className="h-5 w-5" />}
                  {!selectedFile.type.startsWith('video/') && selectedFile.type !== 'application/pdf' && <Paperclip className="h-5 w-5" />}
                  <span className="text-sm font-medium max-w-[150px] truncate">{selectedFile.name}</span>
                </div>
              )}
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                onClick={clearFile}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || uploadingFile}
              className="shrink-0"
              title="Adjuntar imagen, video o documento"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje o adjunta un archivo..."
              className="flex-1"
              disabled={loading || uploadingFile}
            />
            <Button
              type="submit"
              disabled={loading || uploadingFile || (!newMessage.trim() && !selectedFile)}
              className="bg-gradient-to-r from-primary to-accent shrink-0"
            >
              {uploadingFile ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
