interface SearchIntent {
    post_type?: "OFFERING" | "SEEKING" | null;
    location?: string[] | null;
    min_budget?: number | null;
    max_budget?: number | null;
    gender_preference?: "MALE" | "FEMALE" | "ANY" | null;
    pet_preference?: "ALLOWED" | "NOT_ALLOWED" | "PREFERRED" | null;
    furnishing?: "FULLY_FURNISHED" | "SEMI_FURNISHED" | "UNFURNISHED" | null;
    food_preference?: "VEGETARIAN_ONLY" | "NON_VEG_ALLOWED" | "ANY" | null;
    location_id?: number | null;
}
export declare class ListingRepository {
    private matchesIntent;
    saveListing(listing: any): Promise<any>;
    searchIntent(intent: SearchIntent): Promise<any>;
}
export {};
//# sourceMappingURL=listing.repository.d.ts.map