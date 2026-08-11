import { supabase } from "../../db/client.js";

interface SearchIntent {
  post_type?: "OFFERING" | "SEEKING" | null;
  location?: string[] | null;
  min_budget?: number | null;
  max_budget?: number | null;
  gender_preference?: "MALE" | "FEMALE" | "ANY" | null;
  pet_preference?: "ALLOWED" | "NOT_ALLOWED" | "PREFERRED" | null;
}

export class ListingRepository {
  async saveListing(listing: any) {
    const { data, error } = await supabase
      .from("listings")
      .insert(listing)
      .select()
      .single();

    if (error) {
      console.error("Error inserting listing:", error);
      return null;
    }
    return data;
  }

  async searchIntent(intent: SearchIntent) {
    console.log(" finding relevant listing for the listing db..");
    let query = supabase.from("listings").select("*");
    if (intent.post_type) {
      query = query.eq("post_type", intent.post_type);
    }
    if (intent.max_budget != null) {
      query = query.lte("price_max", intent.max_budget);
    }
    if (intent.min_budget != null) {
      query = query.gte("price_min", intent.min_budget);
    }
    if (intent.gender_preference && intent.gender_preference !== "ANY") {
      query = query.eq("gender_preference", intent.gender_preference);
    }

    if (intent.location != null && intent.location.length) {
      query = query.overlaps("location", intent.location);
    }
    const { data } = await query;
    if (data && data.length) return data;

    // Fallback: broaden budget and do fuzzy location matching when no results
    console.log(
      "No results from primary query — running fallback/widened search...",
    );

    const locToken =
      intent.location && intent.location.length ? intent.location[0] : null;

    if (locToken) {
      try {
        const { data: fuzzyLocationData, error: fuzzyLocationError } =
          await supabase.rpc("search_listings_by_location", {
            search_term: locToken,
          });

        if (fuzzyLocationError) {
          console.warn(
            "Fuzzy location RPC failed, falling back to text search:",
            fuzzyLocationError,
          );
        }

        if (fuzzyLocationData && fuzzyLocationData.length) {
          return fuzzyLocationData;
        }
      } catch (error) {
        console.warn(
          "Fuzzy location RPC call failed, continuing fallback query:",
          error,
        );
      }
    }

    let fallbackQuery = supabase.from("listings").select("*");
    // widen budget by 25%
    if (intent.max_budget != null) {
      const widenedMax = Math.round(intent.max_budget * 1.25);
      fallbackQuery = fallbackQuery.lte("price_max", widenedMax);
    }
    if (intent.min_budget != null) {
      const widenedMin = Math.round((intent.min_budget ?? 0) * 0.8);
      fallbackQuery = fallbackQuery.gte("price_min", widenedMin);
    }

    const fuzzyToken = locToken ? `%${locToken}%` : null;
    if (fuzzyToken) {
      fallbackQuery = fallbackQuery.or(
        `property_type.ilike.${fuzzyToken},author.ilike.${fuzzyToken}`,
      );
    }

    const { data: fallbackData } = await fallbackQuery;
    return fallbackData;
  }
}
