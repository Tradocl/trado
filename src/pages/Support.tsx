import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Send, MessageCircle, ArrowLeft, Trash2, LifeBuoy, Sparkles, Mail, ChevronRight, HelpCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SupportThread {
  id: string;
  title: string;
  status: string;
  updated_at: string;
}

const FAQ_SUGGESTIONS = [
  { icon: HelpCircle, label: "¿Cómo funciona el escrow?", prompt: "¿Cómo funciona el sistema de escrow de Trado?" },
  { icon: HelpCircle, label: "¿Cuánto cobra Trado?", prompt: "¿Cuál es la comisión de Trado y cómo se calcula?" },
  { icon: HelpCircle, label: "¿Cómo retiro mi dinero?", prompt: "¿Cómo solicito un retiro de mi billetera?" },
  { icon: HelpCircle, label: "¿Por qué debo verificarme?", prompt: "¿Cuáles son los beneficios de verificar mi identidad y cuáles son los límites si no lo hago?" },
  { icon: HelpCircle, label: "¿Qué hago si hay problema?", prompt: "¿Qué hago si tengo un problema con una transacción y necesito apelar?" },
];

const SUPPORT_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`;

export default function Support() {
  const { user } = useAuth();
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [creating, setCreating] = useState(false);
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load thread list
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingThreads(true);
      const { data, error } = await supabase
        .from("support_threads")
        .select("id,title,status,updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (!error) setThreads(data ?? []);
      setLoadingThreads(false);
    })();
  }, [user]);

  // Load messages for active thread
  useEffect(() => {
    if (!threadId) {
      setInitialMessages(null);
      return;
    }
    setLoadingMessages(true);
    setInitialMessages(null);
    (async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("id,role,parts,created_at")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (error) {
        toast.error("No se pudo cargar la conversación");
        setInitialMessages([]);
      } else {
        const msgs: UIMessage[] = (data ?? []).map((m: any) => ({
          id: m.id,
          role: m.role,
          parts: Array.isArray(m.parts) ? m.parts : [],
        }));
        setInitialMessages(msgs);
      }
      setLoadingMessages(false);
    })();
  }, [threadId]);

  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: SUPPORT_FN_URL,
      prepareSendMessagesRequest: async ({ messages, id }) => {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        return {
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: { messages, threadId: id },
        };
      },
    });
  }, []);

  const { messages, sendMessage, status, error } = useChat({
    id: threadId,
    messages: initialMessages ?? [],
    transport,
    onError: (e) => {
      console.error(e);
      toast.error("Error en el chat: " + e.message);
    },
    onFinish: () => {
      // Refresh thread list to show updated title/status
      refreshThreads();
    },
  });

  const refreshThreads = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("support_threads")
      .select("id,title,status,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (data) setThreads(data);
  };

  // Focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, [threadId, status]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, status]);

  const createThread = async (firstPrompt?: string) => {
    if (!user || creating) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("support_threads")
        .insert({ user_id: user.id, title: "Nueva conversación" })
        .select("id,title,status,updated_at")
        .single();
      if (error) throw error;
      setThreads((prev) => [data, ...prev]);
      navigate(`/support/${data.id}`);
      // If a first prompt was provided, send it after navigation/mount
      if (firstPrompt) {
        setTimeout(() => {
          setInput("");
          sendMessage({ text: firstPrompt });
        }, 100);
      }
    } catch (e: any) {
      toast.error("No se pudo crear la conversación: " + e.message);
    } finally {
      setCreating(false);
    }
  };

  const deleteThread = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Eliminar esta conversación?")) return;
    const { error } = await supabase.from("support_threads").delete().eq("id", id);
    if (error) {
      toast.error("No se pudo eliminar");
      return;
    }
    setThreads((prev) => prev.filter((t) => t.id !== id));
    if (threadId === id) navigate("/support");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    if (!threadId) {
      createThread(text);
    } else {
      sendMessage({ text });
      setInput("");
    }
  };

  const isLoading = status === "submitted" || status === "streaming";
  const activeThread = threads.find((t) => t.id === threadId);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <div className="container max-w-7xl mx-auto p-3 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <LifeBuoy className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold">Centro de Ayuda</h1>
              <p className="text-xs text-muted-foreground">Asistente IA + soporte humano</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
          {/* Thread sidebar */}
          <Card className={cn("p-3 h-fit md:sticky md:top-4", threadId && "hidden md:block")}>
            <Button
              onClick={() => createThread()}
              disabled={creating}
              className="w-full mb-3 bg-gradient-to-r from-primary to-accent"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Nueva conversación
            </Button>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {loadingThreads ? (
                <p className="text-xs text-muted-foreground text-center py-4">Cargando…</p>
              ) : threads.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Sin conversaciones aún</p>
              ) : (
                threads.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/support/${t.id}`)}
                    className={cn(
                      "group flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-accent/50 transition-colors text-sm",
                      threadId === t.id && "bg-accent"
                    )}
                  >
                    <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{t.title}</p>
                      {t.status === "escalated" && (
                        <Badge variant="secondary" className="text-[10px] mt-0.5">
                          <Mail className="h-2.5 w-2.5 mr-1" />Escalado
                        </Badge>
                      )}
                    </div>
                    <button
                      onClick={(e) => deleteThread(t.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-destructive transition-opacity"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Main chat area */}
          <Card className={cn("flex flex-col h-[calc(100vh-12rem)] min-h-[500px]", !threadId && "hidden md:flex")}>
            {!threadId ? (
              // Welcome / FAQ
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold mb-2">¿En qué te ayudo?</h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-md">
                  Pregúntame sobre Trado: cómo funciona el escrow, comisiones, retiros, verificación, apelaciones. Si no puedo resolverlo, escalo tu caso al equipo de soporte.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
                  {FAQ_SUGGESTIONS.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => createThread(s.prompt)}
                      disabled={creating}
                      className="text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/30 transition-colors disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2">
                        <s.icon className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm font-medium">{s.label}</span>
                        <ChevronRight className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Thread header (mobile back) */}
                <div className="md:hidden border-b p-3 flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => navigate("/support")}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <p className="text-sm font-medium truncate">{activeThread?.title ?? "Conversación"}</p>
                  {activeThread?.status === "escalated" && (
                    <Badge variant="secondary" className="ml-auto text-[10px]">
                      <Mail className="h-2.5 w-2.5 mr-1" />Escalado
                    </Badge>
                  )}
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1">
                  <div ref={scrollRef} className="p-4 space-y-4 overflow-y-auto h-full">
                    {loadingMessages ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : messages.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-8">
                        Escribe tu pregunta para empezar
                      </p>
                    ) : (
                      messages.map((m) => <MessageBubble key={m.id} message={m} />)
                    )}
                    {status === "submitted" && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Pensando…</span>
                      </div>
                    )}
                    {error && (
                      <div className="text-sm text-destructive p-3 bg-destructive/10 rounded-md">
                        Error: {error.message}
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Composer */}
                <form onSubmit={handleSubmit} className="border-t p-3 flex gap-2">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Escribe tu pregunta…"
                    disabled={isLoading}
                    autoFocus
                  />
                  <Button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    size="icon"
                    className="bg-gradient-to-r from-primary to-accent shrink-0"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {message.parts?.map((part: any, i: number) => {
          if (part.type === "text") {
            return (
              <p key={i} className="whitespace-pre-wrap break-words">
                {part.text}
              </p>
            );
          }
          if (typeof part.type === "string" && part.type.startsWith("tool-")) {
            const toolName = part.type.replace("tool-", "");
            const state = part.state;
            if (toolName === "escalateToHuman") {
              return (
                <div key={i} className="mt-2 p-2.5 rounded-md bg-background/50 border border-border text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Mail className="h-3.5 w-3.5" />
                    {state === "output-available" ? "Ticket enviado a soporte" : "Escalando a soporte humano…"}
                  </div>
                  {state === "output-available" && part.output?.message && (
                    <p className="text-muted-foreground">{part.output.message}</p>
                  )}
                </div>
              );
            }
            return null;
          }
          return null;
        })}
      </div>
    </div>
  );
}
