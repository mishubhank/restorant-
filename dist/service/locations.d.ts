/** Cleans input without making an unverified spelling correction. */
export declare function normalizeLocations(locations: string[] | null | undefined): string[] | null;
/**
 * Resolves known aliases from Supabase reference data. Unknown values remain
 * untouched, so the database's trigram search can still match new typos.
 */
export declare function resolveLocationAliases(locations: string[] | null | undefined): Promise<string[] | null>;
export interface CanonicalLocation {
    id: number;
    name: string;
    city: string;
    latitude: number | null;
    longitude: number | null;
}
export declare function searchCanonicalLocations(query: string): Promise<CanonicalLocation[]>;
export declare function getCanonicalLocation(id: number): Promise<CanonicalLocation | null>;
export declare function createCanonicalLocation(name: string, city?: string): Promise<CanonicalLocation>;
export default normalizeLocations;
//# sourceMappingURL=locations.d.ts.map