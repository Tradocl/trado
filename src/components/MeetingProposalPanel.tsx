import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Clock, Check, X, Send, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface MeetingProposal {
  id: string;
  transaction_id: string;
  proposer_id: string;
  proposed_location: string;
  proposed_datetime: string;
  message: string | null;
  status: string;
  responded_at: string | null;
  created_at: string;
}

interface MeetingProposalPanelProps {
  transactionId: string;
  userId: string;
  sellerId: string;
  buyerId: string;
  sellerName: string;
  buyerName: string;
  isSeller: boolean;
  onMeetingConfirmed?: () => void;
}

export const MeetingProposalPanel = ({
  transactionId,
  userId,
  sellerId,
  buyerId,
  sellerName,
  buyerName,
  isSeller,
  onMeetingConfirmed,
}: MeetingProposalPanelProps) => {
  const [proposals, setProposals] = useState<MeetingProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");

  const acceptedProposal = proposals.find(p => p.status === "accepted");

  useEffect(() => {
    loadProposals();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel(`meeting-proposals-${transactionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "meeting_proposals",
          filter: `transaction_id=eq.${transactionId}`,
        },
        () => {
          loadProposals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [transactionId]);

  const loadProposals = async () => {
    try {
      const { data, error } = await supabase
        .from("meeting_proposals")
        .select("*")
        .eq("transaction_id", transactionId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProposals(data || []);
    } catch (error: any) {
      console.error("Error loading proposals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim() || !date || !time) {
      toast.error("Por favor completa la ubicación, fecha y hora");
      return;
    }

    setSubmitting(true);
    try {
      const proposedDatetime = new Date(`${date}T${time}`);
      
      const { error } = await supabase.from("meeting_proposals").insert({
        transaction_id: transactionId,
        proposer_id: userId,
        proposed_location: location.trim(),
        proposed_datetime: proposedDatetime.toISOString(),
        message: message.trim() || null,
        status: "pending",
      });

      if (error) throw error;

      // Send notification to the other party
      const formattedDate = format(proposedDatetime, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es });
      try {
        await supabase.functions.invoke("notify-transaction-action", {
          body: {
            transactionId,
            actionType: "meeting_proposed",
            actorId: userId,
            additionalData: {
              location: location.trim(),
              datetime: formattedDate,
            },
          },
        });
      } catch (notifyError) {
        console.error("Error sending notification:", notifyError);
      }

      toast.success("¡Propuesta de encuentro enviada!");
      setShowForm(false);
      setLocation("");
      setDate("");
      setTime("");
      setMessage("");
      loadProposals();
    } catch (error: any) {
      toast.error("Error al enviar propuesta: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptProposal = async (proposalId: string) => {
    try {
      // Update proposal status
      const { error: proposalError } = await supabase
        .from("meeting_proposals")
        .update({ 
          status: "accepted",
          responded_at: new Date().toISOString()
        })
        .eq("id", proposalId);

      if (proposalError) throw proposalError;

      // Update transaction state to in_delivery so buyer can confirm receipt
      const { error: txError } = await supabase
        .from("transactions")
        .update({ 
          state: "in_delivery",
          shipped_at: new Date().toISOString()
        })
        .eq("id", transactionId);

      if (txError) throw txError;

      // Find the proposal to get proposer info and notify them
      const proposal = proposals.find(p => p.id === proposalId);
      if (proposal) {
        try {
          await supabase.functions.invoke("notify-transaction-action", {
            body: {
              transactionId,
              actionType: "meeting_accepted",
              actorId: userId,
            },
          });
        } catch (notifyError) {
          console.error("Error sending notification:", notifyError);
        }
      }

      toast.success("¡Encuentro confirmado! Ahora coordinen la entrega.");
      loadProposals();
      onMeetingConfirmed?.();
    } catch (error: any) {
      toast.error("Error al aceptar propuesta: " + error.message);
    }
  };

  const handleRejectProposal = async (proposalId: string) => {
    try {
      const { error } = await supabase
        .from("meeting_proposals")
        .update({ 
          status: "rejected",
          responded_at: new Date().toISOString()
        })
        .eq("id", proposalId);

      if (error) throw error;

      // Notify proposer that their proposal was rejected
      try {
        await supabase.functions.invoke("notify-transaction-action", {
          body: {
            transactionId,
            actionType: "meeting_rejected",
            actorId: userId,
          },
        });
      } catch (notifyError) {
        console.error("Error sending notification:", notifyError);
      }

      toast.info("Propuesta rechazada. Puedes proponer otra opción.");
      loadProposals();
    } catch (error: any) {
      toast.error("Error al rechazar propuesta: " + error.message);
    }
  };

  const getProposerName = (proposerId: string) => {
    return proposerId === sellerId ? sellerName : buyerName;
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Cargando propuestas...
      </div>
    );
  }

  // Show accepted meeting info prominently
  if (acceptedProposal) {
    return (
      <Card className="border-2 border-success/30 bg-gradient-to-br from-success/10 to-success/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-success">
            <Check className="h-5 w-5" />
            Encuentro Confirmado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-background/50 rounded-lg space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-semibold">Lugar</p>
                <p className="text-muted-foreground">{acceptedProposal.proposed_location}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-semibold">Fecha y Hora</p>
                <p className="text-muted-foreground">
                  {format(new Date(acceptedProposal.proposed_datetime), "EEEE d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                </p>
              </div>
            </div>
            {acceptedProposal.message && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground italic">"{acceptedProposal.message}"</p>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            📍 Recuerda llevar el producto y confirmar el encuentro
          </p>
        </CardContent>
      </Card>
    );
  }

  const pendingProposals = proposals.filter(p => p.status === "pending");

  return (
    <Card className="border-2 border-info/30 bg-gradient-to-br from-info/10 to-info/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-info">
          <Users className="h-5 w-5" />
          Propuestas de Encuentro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pending proposals */}
        {pendingProposals.map((proposal) => {
          const isMyProposal = proposal.proposer_id === userId;
          
          return (
            <div
              key={proposal.id}
              className="p-4 border rounded-lg bg-background/50 space-y-3"
            >
              <div className="flex items-center justify-between">
                <Badge variant={isMyProposal ? "secondary" : "default"}>
                  {isMyProposal ? "Tu propuesta" : `Propuesta de ${getProposerName(proposal.proposer_id)}`}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(proposal.created_at), "dd/MM HH:mm")}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{proposal.proposed_location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(new Date(proposal.proposed_datetime), "EEEE d 'de' MMMM", { locale: es })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(new Date(proposal.proposed_datetime), "HH:mm")}
                  </span>
                </div>
                {proposal.message && (
                  <p className="text-sm text-muted-foreground italic pt-1">
                    "{proposal.message}"
                  </p>
                )}
              </div>

              {!isMyProposal && (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleAcceptProposal(proposal.id)}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Aceptar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleRejectProposal(proposal.id)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Rechazar
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {/* Show rejected proposals summary */}
        {proposals.filter(p => p.status === "rejected").length > 0 && (
          <p className="text-sm text-muted-foreground">
            {proposals.filter(p => p.status === "rejected").length} propuesta(s) rechazada(s)
          </p>
        )}

        {/* New proposal form */}
        {showForm ? (
          <form onSubmit={handleSubmitProposal} className="space-y-4 p-4 border rounded-lg bg-background/50">
            <div className="space-y-2">
              <Label htmlFor="location">Lugar de encuentro</Label>
              <Input
                id="location"
                placeholder="Ej: Mall Plaza Norte, entrada principal"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Hora</Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Mensaje (opcional)</Label>
              <Textarea
                id="message"
                placeholder="Información adicional..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={submitting}>
                <Send className="h-4 w-4 mr-2" />
                {submitting ? "Enviando..." : "Enviar Propuesta"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowForm(true)}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Proponer Lugar y Hora
          </Button>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Coordinen un lugar público y seguro para el encuentro
        </p>
      </CardContent>
    </Card>
  );
};
