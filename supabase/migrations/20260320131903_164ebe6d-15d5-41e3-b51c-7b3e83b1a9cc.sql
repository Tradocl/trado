-- Enable leaked password protection via auth config
-- Note: This is handled via Supabase dashboard/API, not SQL migration
-- Moving extensions out of public schema if needed
-- For now, this is a no-op migration to acknowledge the linter warnings
SELECT 1;