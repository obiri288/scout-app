-- CAVIO Database Webhook Setup for Welcome Email
-- This script creates a trigger to automatically invoke the Deno Edge Function when a new record is inserted into the waitlist.

-- Enable pg_net extension for asynchronous HTTP requests if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_waitlist_entry()
RETURNS TRIGGER AS $$
DECLARE
  project_url text := 'https://wwdfagjgnliwraqrwusc.supabase.co'; -- CAVIO Supabase Project URL
  service_role_key text;
BEGIN
  -- We trigger the HTTP POST request to the Edge Function asynchronously via pg_net.
  -- This ensures zero database transaction delays and a non-blocking experience.
  PERFORM net.http_post(
    url := project_url || '/functions/v1/send-welcome-email',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'record', row_to_json(NEW)
    ),
    timeout_milliseconds := 5000
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it already exists to avoid duplication
DROP TRIGGER IF EXISTS tr_new_waitlist_entry ON public.waitlist;

-- Attach the trigger to fire AFTER INSERT on the waitlist table
CREATE TRIGGER tr_new_waitlist_entry
AFTER INSERT ON public.waitlist
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_waitlist_entry();
