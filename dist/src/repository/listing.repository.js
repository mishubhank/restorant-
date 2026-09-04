import { supabase } from "../../db/client.js";
export class ListingRepository {
    matchesIntent(listing, intent) {
        if (intent.post_type && listing.post_type !== intent.post_type)
            return false;
        if (intent.max_budget != null &&
            (listing.price_max == null || listing.price_max > intent.max_budget)) {
            return false;
        }
        if (intent.min_budget != null &&
            (listing.price_min == null || listing.price_min < intent.min_budget)) {
            return false;
        }
        if (intent.gender_preference &&
            intent.gender_preference !== "ANY" &&
            listing.gender_preference !== intent.gender_preference) {
            return false;
        }
        if (intent.furnishing && listing.furnishing !== intent.furnishing)
            return false;
        if (intent.food_preference &&
            intent.food_preference !== "ANY" &&
            listing.food_preference !== intent.food_preference) {
            return false;
        }
        return true;
    }
    async saveListing(listing) {
        const { data, error } = await supabase
            .from("listings")
            .insert(listing)
            .select()
            .single();
        if (error) {
            console.error("Error inserting listing:", error);
            throw error;
        }
        return data;
    }
    async searchIntent(intent) {
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
        if (intent.furnishing) {
            query = query.eq("furnishing", intent.furnishing);
        }
        if (intent.food_preference && intent.food_preference !== "ANY") {
            query = query.eq("food_preference", intent.food_preference);
        }
        if (intent.location != null && intent.location.length) {
            query = query.overlaps("location", intent.location);
        }
        const { data } = await query;
        if (data && data.length)
            return data;
        // Fallback: use typo-tolerant, case-insensitive location matching. The
        // RPC intentionally searches only locations, so retain every other user
        // constraint here before returning its results.
        console.log("No results from primary query — running fallback/widened search...");
        const locTerms = intent.location?.filter(Boolean) ?? [];
        if (locTerms.length) {
            try {
                const { data: fuzzyLocationData, error: fuzzyLocationError } = await supabase.rpc("search_listings_by_location", {
                    search_terms: locTerms,
                });
                if (fuzzyLocationError) {
                    console.warn("Fuzzy location RPC failed, falling back to text search:", fuzzyLocationError);
                }
                if (fuzzyLocationData && fuzzyLocationData.length) {
                    const matchingListings = fuzzyLocationData.filter((listing) => this.matchesIntent(listing, intent));
                    if (matchingListings.length)
                        return matchingListings;
                }
            }
            catch (error) {
                console.warn("Fuzzy location RPC call failed, continuing fallback query:", error);
            }
        }
        // Never replace a requested area with arbitrary city-wide results. A
        // nearby-area fallback must be distance-based and therefore needs stored
        // coordinates; see the database migration for the typo-tolerant layer.
        if (locTerms.length)
            return [];
        let fallbackQuery = supabase.from("listings").select("*");
        if (intent.post_type) {
            fallbackQuery = fallbackQuery.eq("post_type", intent.post_type);
        }
        if (intent.gender_preference && intent.gender_preference !== "ANY") {
            fallbackQuery = fallbackQuery.eq("gender_preference", intent.gender_preference);
        }
        if (intent.furnishing) {
            fallbackQuery = fallbackQuery.eq("furnishing", intent.furnishing);
        }
        if (intent.food_preference && intent.food_preference !== "ANY") {
            fallbackQuery = fallbackQuery.eq("food_preference", intent.food_preference);
        }
        // widen budget by 25%
        if (intent.max_budget != null) {
            const widenedMax = Math.round(intent.max_budget * 1.25);
            fallbackQuery = fallbackQuery.lte("price_max", widenedMax);
        }
        if (intent.min_budget != null) {
            const widenedMin = Math.round((intent.min_budget ?? 0) * 0.8);
            fallbackQuery = fallbackQuery.gte("price_min", widenedMin);
        }
        const { data: fallbackData } = await fallbackQuery;
        return fallbackData;
    }
}
//# sourceMappingURL=listing.repository.js.map