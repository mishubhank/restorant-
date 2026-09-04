import { UserSearchIntent } from "./UserPromt.js";
import { RankingService } from "./rankingService.js";
import { ListingRepository } from "../src/repository/listing.repository.js";
import { formatListings } from "./responseFormatter.js";
const lisitinRep = new ListingRepository();
const rankingService = new RankingService();
const activeGeminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY ?? "";
export async function Search(userPrompt, selectedLocation) {
    console.log("[DEBUG] SearchService Gemini API key:", {
        GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        activeGeminiKey,
        activeKeyLength: activeGeminiKey.length,
    });
    if (typeof userPrompt !== "string" || !userPrompt.trim()) {
        throw new Error("Invalid user prompt");
    }
    const promptWithLocation = selectedLocation
        ? `${userPrompt}\nSelected canonical location: ${selectedLocation.name}, ${selectedLocation.city}`
        : userPrompt;
    const filteredPrompt = await UserSearchIntent(promptWithLocation);
    const searchIntent = { ...filteredPrompt };
    if (filteredPrompt.post_type === "SEEKING") {
        searchIntent.post_type = "OFFERING";
    }
    else if (filteredPrompt.post_type === "OFFERING") {
        searchIntent.post_type = "SEEKING";
    }
    const listing = await lisitinRep.searchIntent(searchIntent);
    const ranking = await rankingService.rankResults(listing);
    // Format the results into human-readable format
    const formattedResponse = formatListings(ranking);
    return formattedResponse;
}
//# sourceMappingURL=SearchService.js.map