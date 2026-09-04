-- The processing worker marks non-listing posts as ignored. This column was
-- missing from the current raw_posts table and would otherwise stop the worker
-- when it encounters an irrelevant post.
ALTER TABLE public.raw_posts
  ADD COLUMN IF NOT EXISTS is_ignored boolean NOT NULL DEFAULT false;
