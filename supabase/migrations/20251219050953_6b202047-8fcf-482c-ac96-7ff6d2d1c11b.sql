-- Add email_thread_id column to store the Message-ID of the first email for each transaction
ALTER TABLE public.transactions ADD COLUMN email_thread_id text;