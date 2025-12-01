import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  user?: {
    full_name: string;
  } | null;
}

interface AppealChatProps {
  appealId: string;
  currentUserId: string;
}

export function AppealChat({ appealId, currentUserId }: AppealChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`appeal-chat-${appealId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "appeal_messages",
          filter: `appeal_id=eq.${appealId}`,
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
  }, [appealId]);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("appeal_messages")
        .select(`
          *,
          user:profiles(full_name)
        `)
        .eq("appeal_id", appealId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages((data as any) || []);
      setTimeout(scrollToBottom, 100);
    } catch (error: any) {
      console.error("Error loading messages:", error);
      toast.error("Error al cargar mensajes");
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("appeal_messages").insert({
        appeal_id: appealId,
        user_id: currentUserId,
        message: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage("");
      scrollToBottom();
    } catch (error: any) {
      toast.error("Error al enviar mensaje: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-primary/20 shadow-xl">
      <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-accent/5">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          Chat de la Apelación
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
                const isOwn = msg.user_id === currentUserId;
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
                        {msg.user?.full_name || "Usuario"}
                      </p>
                      <p className="text-sm break-words">{msg.message}</p>
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
        <form onSubmit={sendMessage} className="p-4 border-t bg-muted/30">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="flex-1"
              disabled={loading}
            />
            <Button
              type="submit"
              disabled={loading || !newMessage.trim()}
              className="bg-gradient-to-r from-primary to-accent shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}