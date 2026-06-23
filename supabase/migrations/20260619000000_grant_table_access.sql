-- Grant table-level access to anon and authenticated roles
-- Required when tables are created via migrations (not dashboard)
-- RLS policies control row-level access; this grants schema-level access

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallets TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallet_movements TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ratings TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appeals TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appeal_messages TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appeal_evidence TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appeal_decisions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appeal_ratings TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appeal_mutual_proposals TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_proposals TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_threads TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_messages TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_categories TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO anon, authenticated;

-- Grant access to sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Also check push_subscriptions if exists
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO anon, authenticated;
