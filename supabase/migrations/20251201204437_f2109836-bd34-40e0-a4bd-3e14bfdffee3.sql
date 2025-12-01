-- Create enum for appeal status
CREATE TYPE public.appeal_status AS ENUM (
  'no_hay_apelacion',
  'apelacion_abierta',
  'en_negociacion',
  'pendiente_intervencion_plataforma',
  'en_revision_plataforma',
  'resuelta_a_favor_comprador',
  'resuelta_a_favor_vendedor',
  'resuelta_parcial',
  'cerrada'
);

-- Create enum for appeal reason
CREATE TYPE public.appeal_reason AS ENUM (
  'producto_no_llego',
  'producto_diferente',
  'danos_o_fallas',
  'incumplimiento_acuerdo',
  'otro'
);

-- Create enum for appeal resolution
CREATE TYPE public.appeal_resolution AS ENUM (
  'liberar_fondos_vendedor',
  'reembolso_parcial',
  'reembolso_total',
  'solicitar_mas_evidencia'
);

-- Create appeals table
CREATE TABLE public.appeals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  initiator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason appeal_reason NOT NULL,
  reason_description TEXT,
  status appeal_status NOT NULL DEFAULT 'apelacion_abierta',
  negotiation_deadline TIMESTAMP WITH TIME ZONE,
  escalated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appeal messages table
CREATE TABLE public.appeal_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appeal_id UUID NOT NULL REFERENCES public.appeals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appeal evidence table
CREATE TABLE public.appeal_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appeal_id UUID NOT NULL REFERENCES public.appeals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appeal decisions table
CREATE TABLE public.appeal_decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appeal_id UUID NOT NULL REFERENCES public.appeals(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resolution appeal_resolution NOT NULL,
  resolution_notes TEXT NOT NULL,
  buyer_refund_amount NUMERIC(10, 2),
  seller_payment_amount NUMERIC(10, 2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appeal ratings table (post-resolution)
CREATE TABLE public.appeal_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appeal_id UUID NOT NULL REFERENCES public.appeals(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(appeal_id, rater_id)
);

-- Add appeal_status to transactions table
ALTER TABLE public.transactions 
ADD COLUMN appeal_status appeal_status DEFAULT 'no_hay_apelacion';

-- Enable RLS
ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appeal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appeal_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appeal_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appeal_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for appeals
CREATE POLICY "Transaction participants can view appeals"
ON public.appeals FOR SELECT
USING (
  transaction_id IN (
    SELECT id FROM transactions 
    WHERE seller_id = auth.uid() OR buyer_id = auth.uid()
  )
);

CREATE POLICY "Transaction participants can create appeals"
ON public.appeals FOR INSERT
WITH CHECK (
  transaction_id IN (
    SELECT id FROM transactions 
    WHERE seller_id = auth.uid() OR buyer_id = auth.uid()
  ) AND initiator_id = auth.uid()
);

CREATE POLICY "Transaction participants can update their appeals"
ON public.appeals FOR UPDATE
USING (
  transaction_id IN (
    SELECT id FROM transactions 
    WHERE seller_id = auth.uid() OR buyer_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all appeals"
ON public.appeals FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all appeals"
ON public.appeals FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for appeal_messages
CREATE POLICY "Appeal participants can view messages"
ON public.appeal_messages FOR SELECT
USING (
  appeal_id IN (
    SELECT a.id FROM appeals a
    JOIN transactions t ON a.transaction_id = t.id
    WHERE t.seller_id = auth.uid() OR t.buyer_id = auth.uid()
  )
);

CREATE POLICY "Appeal participants can send messages during negotiation"
ON public.appeal_messages FOR INSERT
WITH CHECK (
  appeal_id IN (
    SELECT a.id FROM appeals a
    JOIN transactions t ON a.transaction_id = t.id
    WHERE (t.seller_id = auth.uid() OR t.buyer_id = auth.uid())
    AND a.status IN ('apelacion_abierta', 'en_negociacion')
  ) AND user_id = auth.uid()
);

CREATE POLICY "Admins can view all appeal messages"
ON public.appeal_messages FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for appeal_evidence
CREATE POLICY "Appeal participants can view evidence"
ON public.appeal_evidence FOR SELECT
USING (
  appeal_id IN (
    SELECT a.id FROM appeals a
    JOIN transactions t ON a.transaction_id = t.id
    WHERE t.seller_id = auth.uid() OR t.buyer_id = auth.uid()
  )
);

CREATE POLICY "Appeal participants can upload evidence"
ON public.appeal_evidence FOR INSERT
WITH CHECK (
  appeal_id IN (
    SELECT a.id FROM appeals a
    JOIN transactions t ON a.transaction_id = t.id
    WHERE t.seller_id = auth.uid() OR t.buyer_id = auth.uid()
  ) AND user_id = auth.uid()
);

CREATE POLICY "Admins can view all evidence"
ON public.appeal_evidence FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for appeal_decisions
CREATE POLICY "Appeal participants can view decisions"
ON public.appeal_decisions FOR SELECT
USING (
  appeal_id IN (
    SELECT a.id FROM appeals a
    JOIN transactions t ON a.transaction_id = t.id
    WHERE t.seller_id = auth.uid() OR t.buyer_id = auth.uid()
  )
);

CREATE POLICY "Admins can create decisions"
ON public.appeal_decisions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') AND admin_id = auth.uid());

CREATE POLICY "Admins can view all decisions"
ON public.appeal_decisions FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for appeal_ratings
CREATE POLICY "Appeal participants can view ratings"
ON public.appeal_ratings FOR SELECT
USING (
  appeal_id IN (
    SELECT a.id FROM appeals a
    JOIN transactions t ON a.transaction_id = t.id
    WHERE t.seller_id = auth.uid() OR t.buyer_id = auth.uid()
  )
);

CREATE POLICY "Appeal participants can create ratings"
ON public.appeal_ratings FOR INSERT
WITH CHECK (
  appeal_id IN (
    SELECT a.id FROM appeals a
    JOIN transactions t ON a.transaction_id = t.id
    WHERE t.seller_id = auth.uid() OR t.buyer_id = auth.uid()
  ) AND rater_id = auth.uid()
);

CREATE POLICY "Admins can view all ratings"
ON public.appeal_ratings FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create storage bucket for appeal evidence
INSERT INTO storage.buckets (id, name, public)
VALUES ('appeal-evidence', 'appeal-evidence', false);

-- Storage policies for appeal evidence
CREATE POLICY "Appeal participants can upload evidence files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'appeal-evidence' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Appeal participants can view evidence files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'appeal-evidence' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM appeals a
      JOIN transactions t ON a.transaction_id = t.id
      WHERE (t.seller_id = auth.uid() OR t.buyer_id = auth.uid())
    )
  )
);

CREATE POLICY "Admins can view all appeal evidence files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'appeal-evidence' AND
  has_role(auth.uid(), 'admin')
);

-- Create trigger to update updated_at
CREATE TRIGGER update_appeals_updated_at
BEFORE UPDATE ON public.appeals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_appeals_transaction_id ON public.appeals(transaction_id);
CREATE INDEX idx_appeals_status ON public.appeals(status);
CREATE INDEX idx_appeal_messages_appeal_id ON public.appeal_messages(appeal_id);
CREATE INDEX idx_appeal_evidence_appeal_id ON public.appeal_evidence(appeal_id);
CREATE INDEX idx_appeal_decisions_appeal_id ON public.appeal_decisions(appeal_id);