
DO $$
DECLARE
  uid uuid := '5e4abc8b-8ce3-4046-be52-38163d5b02b9';
BEGIN
  -- Appeals related
  DELETE FROM appeal_decisions WHERE admin_id = uid OR appeal_id IN (SELECT id FROM appeals WHERE initiator_id = uid OR transaction_id IN (SELECT id FROM transactions WHERE seller_id = uid OR buyer_id = uid));
  DELETE FROM appeal_evidence WHERE user_id = uid OR appeal_id IN (SELECT id FROM appeals WHERE initiator_id = uid OR transaction_id IN (SELECT id FROM transactions WHERE seller_id = uid OR buyer_id = uid));
  DELETE FROM appeal_messages WHERE user_id = uid OR appeal_id IN (SELECT id FROM appeals WHERE initiator_id = uid OR transaction_id IN (SELECT id FROM transactions WHERE seller_id = uid OR buyer_id = uid));
  DELETE FROM appeal_mutual_proposals WHERE proposer_id = uid OR appeal_id IN (SELECT id FROM appeals WHERE initiator_id = uid OR transaction_id IN (SELECT id FROM transactions WHERE seller_id = uid OR buyer_id = uid));
  DELETE FROM appeal_ratings WHERE rater_id = uid OR appeal_id IN (SELECT id FROM appeals WHERE initiator_id = uid OR transaction_id IN (SELECT id FROM transactions WHERE seller_id = uid OR buyer_id = uid));
  DELETE FROM appeals WHERE initiator_id = uid OR transaction_id IN (SELECT id FROM transactions WHERE seller_id = uid OR buyer_id = uid);

  -- Transaction related
  DELETE FROM return_requests WHERE requester_id = uid OR mediated_by = uid OR transaction_id IN (SELECT id FROM transactions WHERE seller_id = uid OR buyer_id = uid);
  DELETE FROM meeting_proposals WHERE proposer_id = uid OR transaction_id IN (SELECT id FROM transactions WHERE seller_id = uid OR buyer_id = uid);
  DELETE FROM chat_messages WHERE user_id = uid OR transaction_id IN (SELECT id FROM transactions WHERE seller_id = uid OR buyer_id = uid);
  DELETE FROM ratings WHERE rater_id = uid OR rated_id = uid OR transaction_id IN (SELECT id FROM transactions WHERE seller_id = uid OR buyer_id = uid);
  DELETE FROM transactions WHERE seller_id = uid OR buyer_id = uid;

  -- Wallet
  UPDATE wallet_movements SET reviewed_by = NULL WHERE reviewed_by = uid;
  DELETE FROM wallet_movements WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id = uid);
  DELETE FROM wallets WHERE user_id = uid;

  -- Misc
  DELETE FROM push_subscriptions WHERE user_id = uid;
  DELETE FROM user_roles WHERE user_id = uid;
  DELETE FROM profiles WHERE id = uid;
  DELETE FROM auth.users WHERE id = uid;
END $$;
