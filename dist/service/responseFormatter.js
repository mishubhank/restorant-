/**
 * Formats raw database listings into human-readable responses with images/thumbnails
 */
function normalizeUrl(value) {
    if (typeof value !== "string")
        return undefined;
    const cleaned = value
        .trim()
        .replace(/^['"]+|['"]+$/g, "")
        .trim();
    return cleaned.length > 0 ? cleaned : undefined;
}
export function formatListings(rawListings) {
    if (!rawListings || rawListings.length === 0) {
        return {
            type: "results",
            message: "No available listings match that search yet. Try a nearby area, a higher budget, or create an alert. Posts from people looking for a home are kept separate from available listings.",
            count: 0,
            listings: [],
        };
    }
    const listings = rawListings.map((listing) => formatListing(listing));
    return {
        type: "results",
        message: `Found ${listings.length} listing${listings.length !== 1 ? "s" : ""} for you:`,
        count: listings.length,
        listings,
    };
}
function formatListing(listing) {
    const priceRange = listing.price_min && listing.price_max
        ? `€${listing.price_min} - €${listing.price_max}/month`
        : listing.price_max
            ? `up to €${listing.price_max}/month`
            : listing.price_min
                ? `from €${listing.price_min}/month`
                : "Price not specified";
    const preferences = [];
    if (listing.gender_preference && listing.gender_preference !== "ANY") {
        preferences.push(`${listing.gender_preference.toLowerCase()} preferred`);
    }
    if (listing.pet_preference === "ALLOWED") {
        preferences.push("🐾 Pets allowed");
    }
    else if (listing.pet_preference === "PREFERRED") {
        preferences.push("🐾 Pets preferred");
    }
    else if (listing.pet_preference === "NOT_ALLOWED") {
        preferences.push("❌ No pets");
    }
    if (listing.food_preference) {
        const foodMap = {
            VEGETARIAN_ONLY: "Vegetarian only",
            NON_VEG_ALLOWED: "Non-veg allowed",
            ANY: "Any diet",
        };
        preferences.push(foodMap[listing.food_preference] || listing.food_preference);
    }
    if (listing.furnishing) {
        const furnishingMap = {
            FULLY_FURNISHED: "Fully furnished",
            SEMI_FURNISHED: "Semi-furnished",
            UNFURNISHED: "Unfurnished",
        };
        preferences.push(furnishingMap[listing.furnishing] || listing.furnishing);
    }
    if (listing.additional_preferences &&
        Array.isArray(listing.additional_preferences)) {
        preferences.push(...listing.additional_preferences);
    }
    const locationStr = Array.isArray(listing.location)
        ? listing.location.join(", ")
        : listing.location || "Location not specified";
    const title = `${listing.property_type || "Property"} in ${locationStr}`;
    const description = `${priceRange} • ${listing.post_type === "OFFERING" ? "Listing" : "Wanted"}`;
    const imageUrl = normalizeUrl(listing.image_url) ?? normalizeUrl(listing.thumbnail_url);
    const thumbnailUrl = normalizeUrl(listing.thumbnail_url) ?? normalizeUrl(listing.image_url);
    const sourceUrl = normalizeUrl(listing.source_post_url);
    return {
        id: listing.id || listing.post_id || Math.random().toString(),
        title,
        description,
        price: priceRange,
        location: locationStr,
        property_type: listing.property_type || "Property",
        furnishing: listing.furnishing || "Not specified",
        preferences,
        ...(imageUrl ? { image_url: imageUrl } : {}),
        ...(thumbnailUrl ? { thumbnail_url: thumbnailUrl } : {}),
        ...(sourceUrl ? { source_post_url: sourceUrl } : {}),
        ...(listing.source_author ? { source_author: listing.source_author } : {}),
    };
}
export function formatError(error) {
    return {
        type: "error",
        message: error,
        count: 0,
        listings: [],
    };
}
//# sourceMappingURL=responseFormatter.js.map