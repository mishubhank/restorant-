-- Run once in the Supabase SQL editor. The scraper uploads through the service
-- role; public reads let the frontend render stable listing thumbnails.
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;
