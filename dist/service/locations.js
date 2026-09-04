import { supabase } from "../db/client.js";
function titleCase(s) {
    return s
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
}
function locationKey(location) {
    return location
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
/** Cleans input without making an unverified spelling correction. */
export function normalizeLocations(locations) {
    if (!locations?.length)
        return null;
    const normalized = locations
        .map((location) => (location || "").trim())
        .filter(Boolean)
        .map(titleCase);
    return normalized.length ? [...new Set(normalized)] : null;
}
/**
 * Resolves known aliases from Supabase reference data. Unknown values remain
 * untouched, so the database's trigram search can still match new typos.
 */
export async function resolveLocationAliases(locations) {
    const normalized = normalizeLocations(locations);
    if (!normalized)
        return null;
    const keys = [...new Set(normalized.map(locationKey))];
    const { data, error } = await supabase
        .from("location_aliases")
        .select("alias_key, area:areas(name)")
        .in("alias_key", keys);
    if (error) {
        // The search remains functional while reference data is being deployed.
        console.warn("Could not resolve location aliases:", error.message);
        return normalized;
    }
    const aliases = new Map();
    for (const row of data ?? []) {
        const area = Array.isArray(row.area) ? row.area[0] : row.area;
        if (row.alias_key && area?.name)
            aliases.set(row.alias_key, area.name);
    }
    return [...new Set(normalized.map((location) => aliases.get(locationKey(location)) ?? location))];
}
export async function searchCanonicalLocations(query) {
    const term = query.trim();
    if (!term)
        return [];
    const { data, error } = await supabase
        .from("locations")
        .select("id, name, city, latitude, longitude")
        .or(`name.ilike.%${term}%,city.ilike.%${term}%`)
        .order("name")
        .limit(10);
    if (error)
        throw error;
    return (data ?? []);
}
export async function getCanonicalLocation(id) {
    const { data, error } = await supabase
        .from("locations")
        .select("id, name, city, latitude, longitude")
        .eq("id", id)
        .maybeSingle();
    if (error)
        throw error;
    return data;
}
export async function createCanonicalLocation(name, city = "Bengaluru") {
    const cleanName = name.trim();
    const cleanCity = city.trim() || "Bengaluru";
    if (!cleanName)
        throw new Error("Location name is required");
    const { data, error } = await supabase
        .from("locations")
        .upsert({ name: cleanName, city: cleanCity, latitude: null, longitude: null }, { onConflict: "name,city" })
        .select("id, name, city, latitude, longitude")
        .single();
    if (error)
        throw error;
    return data;
}
export default normalizeLocations;
//# sourceMappingURL=locations.js.map