import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Lock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AppealChatProps {
  appealId: string;
  canSendMessages: boolean;
  currentUserId: string;
}

export function AppealChat({ appealId, canSendMessages, currentUserId }: AppealChatProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`appeal-messages-${appealId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "appeal_messages",
          filter: `appeal_id=eq.${appealId}`,
        },
        () => fetchMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appealId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("appeal_messages")
        .select(`
          *,
          user:profiles!appeal_messages_user_id_fkey(full_name)
        `)
        .eq("appeal_id", appealId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !canSendMessages) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from("appeal_messages")
        .insert({
          appeal_id: appealId,
          user_id: currentUserId,
          message: newMessage.trim(),
        });

      if (error) throw error;
      setNewMessage("");
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error("Error al enviar el mensaje");
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!canSendMessages && messages.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Lock className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>El chat está bloqueado. La apelación está en revisión por la plataforma.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 h-96 overflow-y-auto space-y-4 bg-muted/20">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No hay mensajes aún. Comienza la conversación.
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.user_id === currentUserId;
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    isOwn
                      ? "bg-primary text-primary-foreground"
                      : "bg-background border"
                  }`}
                >
                  <p className="text-sm font-medium mb-1">
                    {message.user?.full_name || "Usuario"}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                  <p className={`text-xs mt-1 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {format(new Date(message.created_at), "HH:mm", { locale: es })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {canSendMessages ? (
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe tu mensaje..."
            className="min-h-[80px]"
            disabled={sending}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            size="icon"
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="bg-muted p-3 rounded-lg text-sm text-center text-muted-foreground">
          <Lock className="h-4 w-4 inline mr-2" />
          El chat está bloqueado mientras la plataforma revisa la apelación
        </div>
      )}
    </div>
  );
}