-- A second overload of get_transaction_preview(transaction_id uuid, invite_code_param text)
-- was created out-of-band, making PostgREST unable to choose between it and the
-- original single-argument version when called with only transaction_id
-- (error PGRST203: "Could not choose the best candidate function"). The invite
-- preview only needs transaction_id and nothing in the app uses the 2-arg form,
-- so drop the duplicate overload to resolve the ambiguity.
DROP FUNCTION IF EXISTS public.get_transaction_preview(uuid, text);
