-- Run once in the Supabase SQL editor before deploying the backend change.
-- `pg_trgm` makes area matching case-insensitive and typo-tolerant:
-- "indranagar" can match "Indiranagar".
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- The original implementation accepted one `text` argument. Remove it so
-- PostgREST cannot retain or select the obsolete RPC signature.
DROP FUNCTION IF EXISTS public.search_listings_by_location(text);

CREATE OR REPLACE FUNCTION public.search_listings_by_location(search_terms text[])
RETURNS SETOF public.listings
LANGUAGE sql
STABLE
AS $$
  WITH scores AS (
    SELECT
      l.id,
      MAX(
        GREATEST(
          similarity(lower(area), lower(term)),
          word_similarity(lower(term), lower(area))
        )
      ) AS location_score
    FROM public.listings AS l
    CROSS JOIN LATERAL unnest(l.location) AS area
    CROSS JOIN LATERAL unnest(search_terms) AS term
    GROUP BY l.id
  )
  SELECT l.*
  FROM public.listings AS l
  INNER JOIN scores AS s ON s.id = l.id
  WHERE s.location_score >= 0.42
  ORDER BY s.location_score DESC;
$$;

-- Supabase's REST layer caches function signatures. Reload it immediately so
-- calls made with { search_terms: [...] } use the function above.
NOTIFY pgrst, 'reload schema';

-- Do not add a trigram index directly to the `location` array: PostgreSQL
-- cannot index array_to_string(...) because it is not IMMUTABLE. For large
-- datasets, move areas into a normalized listing_locations table and index its
-- scalar `name` column with gin_trgm_ops.
