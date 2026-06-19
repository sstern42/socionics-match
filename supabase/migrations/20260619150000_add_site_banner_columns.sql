-- Add site-wide banner columns to stats table (used by Admin page + AnnouncementBanner)
ALTER TABLE stats
  ADD COLUMN IF NOT EXISTS site_banner text DEFAULT '',
  ADD COLUMN IF NOT EXISTS site_banner_active boolean NOT NULL DEFAULT false;
