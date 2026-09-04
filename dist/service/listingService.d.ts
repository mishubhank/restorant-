export declare const answerMyQuestion: (prompt: string, imageUrl?: string) => Promise<{
    post_type: "OFFERING" | "SEEKING" | "IRRELEVANT";
    location: string[];
    property_type: string | null;
    price_min: number | null;
    price_max: number | null;
    furnishing: "FULLY_FURNISHED" | "SEMI_FURNISHED" | "UNFURNISHED" | null;
    gender_preference: "MALE" | "FEMALE" | "ANY" | null;
    pet_preference: "ALLOWED" | "NOT_ALLOWED" | "PREFERRED" | null;
    food_preference: "ANY" | "VEGETARIAN_ONLY" | "NON_VEG_ALLOWED" | null;
    additional_preferences: string[];
    image_url?: string | null | undefined;
    thumbnail_url?: string | null | undefined;
} | null>;
//# sourceMappingURL=listingService.d.ts.map