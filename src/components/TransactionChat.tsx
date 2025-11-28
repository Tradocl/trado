import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  sender_name?: string;
  image_url?: string | null;
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
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor selecciona una imagen válida");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen debe ser menor a 5MB");
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedImage || !user) return null;

    setUploadingImage(true);
    try {
      const fileExt = selectedImage.name.split('.').pop();
      const fileName = `${transactionId}/${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('chat-images')
        .upload(fileName, selectedImage, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      toast.error("Error al subir imagen: " + error.message);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || !user) return;

    setLoading(true);
    try {
      let imageUrl: string | null = null;

      // Upload image if selected
      if (selectedImage) {
        imageUrl = await uploadImage();
        if (!imageUrl && !newMessage.trim()) {
          // If image upload failed and there's no text message, don't send
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase.from("chat_messages").insert({
        transaction_id: transactionId,
        user_id: user.id,
        message: newMessage.trim() || "(imagen)",
        image_url: imageUrl,
      });

      if (error) throw error;

      setNewMessage("");
      clearImage();
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
                      {msg.image_url && (
                        <img 
                          src={msg.image_url} 
                          alt="Imagen compartida"
                          className="rounded-lg max-w-full max-h-64 object-cover mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(msg.image_url!, '_blank')}
                        />
                      )}
                      {msg.message !== "(imagen)" && (
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
          {imagePreview && (
            <div className="relative inline-block">
              <img 
                src={imagePreview} 
                alt="Vista previa" 
                className="h-24 w-24 object-cover rounded-lg border-2 border-primary/30"
              />
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                onClick={clearImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || uploadingImage}
              className="shrink-0"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje o adjunta una imagen..."
              className="flex-1"
              disabled={loading || uploadingImage}
            />
            <Button
              type="submit"
              disabled={loading || uploadingImage || (!newMessage.trim() && !selectedImage)}
              className="bg-gradient-to-r from-primary to-accent shrink-0"
            >
              {uploadingImage ? (
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
