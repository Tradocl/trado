DO $$
DECLARE
  del_id uuid := '337a5734-1077-4929-9e27-720d0dfedf0b';
BEGIN
  DELETE FROM public.appeal_decisions WHERE appeal_id IN (SELECT a.id FROM public.appeals a JOIN public.transactions t ON a.transaction_id=t.id WHERE t.seller_id=del_id OR t.buyer_id=del_id);
  DELETE FROM public.appeal_evidence WHERE user_id=del_id OR appeal_id IN (SELECT a.id FROM public.appeals a JOIN public.transactions t ON a.transaction_id=t.id WHERE t.seller_id=del_id OR t.buyer_id=del_id);
  DELETE FROM public.appeal_messages WHERE user_id=del_id OR appeal_id IN (SELECT a.id FROM public.appeals a JOIN public.transactions t ON a.transaction_id=t.id WHERE t.seller_id=del_id OR t.buyer_id=del_id);
  DELETE FROM public.appeal_mutual_proposals WHERE proposer_id=del_id OR appeal_id IN (SELECT a.id FROM public.appeals a JOIN public.transactions t ON a.transaction_id=t.id WHERE t.seller_id=del_id OR t.buyer_id=del_id);
  DELETE FROM public.appeal_ratings WHERE rater_id=del_id OR appeal_id IN (SELECT a.id FROM public.appeals a JOIN public.transactions t ON a.transaction_id=t.id WHERE t.seller_id=del_id OR t.buyer_id=del_id);
  DELETE FROM public.appeals WHERE initiator_id=del_id OR transaction_id IN (SELECT id FROM public.transactions WHERE seller_id=del_id OR buyer_id=del_id);
  DELETE FROM public.chat_messages WHERE user_id=del_id OR transaction_id IN (SELECT id FROM public.transactions WHERE seller_id=del_id OR buyer_id=del_id);
  DELETE FROM public.meeting_proposals WHERE proposer_id=del_id OR transaction_id IN (SELECT id FROM public.transactions WHERE seller_id=del_id OR buyer_id=del_id);
  DELETE FROM public.ratings WHERE rater_id=del_id OR rated_id=del_id OR transaction_id IN (SELECT id FROM public.transactions WHERE seller_id=del_id OR buyer_id=del_id);
  DELETE FROM public.return_requests WHERE requester_id=del_id OR transaction_id IN (SELECT id FROM public.transactions WHERE seller_id=del_id OR buyer_id=del_id);
  DELETE FROM public.transactions WHERE seller_id=del_id OR buyer_id=del_id;
  UPDATE public.wallet_movements SET reviewed_by=NULL WHERE reviewed_by=del_id;
  DELETE FROM public.wallet_movements WHERE wallet_id IN (SELECT id FROM public.wallets WHERE user_id=del_id);
  DELETE FROM public.wallets WHERE user_id=del_id;
  DELETE FROM public.push_subscriptions WHERE user_id=del_id;
  DELETE FROM public.user_roles WHERE user_id=del_id;
  DELETE FROM public.profiles WHERE id=del_id;
  DELETE FROM auth.users WHERE id=del_id;
END $$;