
DO $$
DECLARE
  uid uuid := 'df68acd4-8fa3-488b-a042-642a2d373b92';
  tx_ids uuid[];
  appeal_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO tx_ids FROM transactions WHERE seller_id = uid OR buyer_id = uid;
  SELECT array_agg(id) INTO appeal_ids FROM appeals WHERE transaction_id = ANY(COALESCE(tx_ids, ARRAY[]::uuid[])) OR initiator_id = uid;

  DELETE FROM appeal_decisions WHERE appeal_id = ANY(COALESCE(appeal_ids, ARRAY[]::uuid[])) OR admin_id = uid;
  DELETE FROM appeal_evidence WHERE appeal_id = ANY(COALESCE(appeal_ids, ARRAY[]::uuid[])) OR user_id = uid;
  DELETE FROM appeal_messages WHERE appeal_id = ANY(COALESCE(appeal_ids, ARRAY[]::uuid[])) OR user_id = uid;
  DELETE FROM appeal_mutual_proposals WHERE appeal_id = ANY(COALESCE(appeal_ids, ARRAY[]::uuid[])) OR proposer_id = uid;
  DELETE FROM appeal_ratings WHERE appeal_id = ANY(COALESCE(appeal_ids, ARRAY[]::uuid[])) OR rater_id = uid;
  DELETE FROM appeals WHERE id = ANY(COALESCE(appeal_ids, ARRAY[]::uuid[]));

  DELETE FROM return_requests WHERE transaction_id = ANY(COALESCE(tx_ids, ARRAY[]::uuid[])) OR requester_id = uid OR mediated_by = uid;
  DELETE FROM meeting_proposals WHERE transaction_id = ANY(COALESCE(tx_ids, ARRAY[]::uuid[])) OR proposer_id = uid;
  DELETE FROM chat_messages WHERE transaction_id = ANY(COALESCE(tx_ids, ARRAY[]::uuid[])) OR user_id = uid;
  DELETE FROM ratings WHERE transaction_id = ANY(COALESCE(tx_ids, ARRAY[]::uuid[])) OR rater_id = uid OR rated_id = uid;

  UPDATE wallet_movements SET reviewed_by = NULL WHERE reviewed_by = uid;
  DELETE FROM wallet_movements WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id = uid)
     OR transaction_id = ANY(COALESCE(tx_ids, ARRAY[]::uuid[]));

  DELETE FROM transactions WHERE id = ANY(COALESCE(tx_ids, ARRAY[]::uuid[]));
  DELETE FROM wallets WHERE user_id = uid;
  DELETE FROM push_subscriptions WHERE user_id = uid;
  DELETE FROM user_roles WHERE user_id = uid;
  DELETE FROM profiles WHERE id = uid;
  DELETE FROM auth.users WHERE id = uid;
END $$;
