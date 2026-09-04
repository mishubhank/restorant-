-- Run in the Supabase SQL editor. This preserves a traceable link back to the
-- original Facebook post, where the poster can be contacted through Facebook.
ALTER TABLE public.raw_posts
  ADD COLUMN IF NOT EXISTS post_link text;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS source_post_url text,
  ADD COLUMN IF NOT EXISTS source_author text;

-- Backfill listings already processed from raw_posts where that source data
-- was captured by the scraper.
UPDATE public.listings AS l
SET
  source_post_url = COALESCE(l.source_post_url, r.post_link),
  source_author = COALESCE(l.source_author, r.author)
FROM public.raw_posts AS r
WHERE l.raw_post_id = r.post_id;
