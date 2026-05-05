
-- Delete all data except for the preserved user
DO $$
DECLARE
  keep_id uuid := 'a1d51433-a6ab-4d77-ae2e-3eeb1d791fbd';
BEGIN
  DELETE FROM public.appeal_decisions WHERE appeal_id IN (SELECT id FROM public.appeals);
  DELETE FROM public.appeal_evidence;
  DELETE FROM public.appeal_messages;
  DELETE FROM public.appeal_mutual_proposals;
  DELETE FROM public.appeal_ratings;
  DELETE FROM public.appeals;
  DELETE FROM public.chat_messages;
  DELETE FROM public.meeting_proposals;
  DELETE FROM public.ratings;
  DELETE FROM public.return_requests;
  DELETE FROM public.transactions;
  DELETE FROM public.wallet_movements;
  DELETE FROM public.wallets WHERE user_id <> keep_id;
  DELETE FROM public.push_subscriptions WHERE user_id <> keep_id;
  DELETE FROM public.user_roles WHERE user_id <> keep_id;
  DELETE FROM public.profiles WHERE id <> keep_id;
  DELETE FROM auth.users WHERE id <> keep_id;
END $$;
