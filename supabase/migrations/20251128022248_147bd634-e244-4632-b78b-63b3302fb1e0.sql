-- Enable realtime for wallets table so balance updates are reflected immediately
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;