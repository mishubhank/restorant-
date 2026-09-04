/**
 * Formats raw database listings into human-readable responses with images/thumbnails
 */
export interface FormattedListing {
    id: string;
    title: string;
    description: string;
    price: string;
    location: string;
    property_type: string;
    furnishing: string;
    preferences: string[];
    image_url?: string;
    thumbnail_url?: string;
    source_post_url?: string;
    source_author?: string;
}
export interface FormattedResponse {
    type: "results" | "error";
    message: string;
    count: number;
    listings: FormattedListing[];
}
export declare function formatListings(rawListings: any[]): FormattedResponse;
export declare function formatError(error: string): FormattedResponse;
//# sourceMappingURL=responseFormatter.d.ts.map