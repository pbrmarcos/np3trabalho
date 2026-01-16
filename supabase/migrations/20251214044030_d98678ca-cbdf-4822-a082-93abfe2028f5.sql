-- Enable realtime for migration_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.migration_requests;