-- Create this function in your Supabase/Postgres database.
-- It performs fuzzy matching against the `location` array by converting it to text.
-- Run this with psql or Supabase SQL editor.

CREATE OR REPLACE FUNCTION public.search_listings_by_location(search_term text)
RETURNS SETOF public.listings AS $$
SELECT *
FROM public.listings
WHERE array_to_string(location, ' ') ILIKE '%' || search_term || '%';
$$ LANGUAGE sql STABLE;
