-- Support threads
CREATE TABLE public.support_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Nueva conversación',
  status text NOT NULL DEFAULT 'open',
  escalated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_threads_user ON public.support_threads(user_id, updated_at DESC);

ALTER TABLE public.support_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own threads"
ON public.support_threads FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all threads"
ON public.support_threads FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_support_threads_updated
BEFORE UPDATE ON public.support_threads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Support messages
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.support_threads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  parts jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_messages_thread ON public.support_messages(thread_id, created_at);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own thread messages"
ON public.support_messages FOR SELECT
TO authenticated
USING (thread_id IN (SELECT id FROM public.support_threads WHERE user_id = auth.uid()));

CREATE POLICY "Users insert own thread messages"
ON public.support_messages FOR INSERT
TO authenticated
WITH CHECK (thread_id IN (SELECT id FROM public.support_threads WHERE user_id = auth.uid()));

CREATE POLICY "Admins view all messages"
ON public.support_messages FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role inserts messages"
ON public.support_messages FOR INSERT
TO service_role
WITH CHECK (true);