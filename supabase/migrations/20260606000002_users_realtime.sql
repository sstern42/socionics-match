-- Add users table to Supabase Realtime publication
-- Required for live join toasts in Layout.jsx
-- Safe to re-run (DO block checks first)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE users;
  END IF;
END $$;
