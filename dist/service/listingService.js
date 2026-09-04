import { supabase } from "../db/client.js";
import { generateText, Output } from "ai";
import { z } from "zod";
import { google } from "@ai-sdk/google";
import { resolveLocationAliases } from "./locations.js";
const PostSchema = z.object({
    post_type: z.enum(["OFFERING", "SEEKING", "IRRELEVANT"]),
    location: z.array(z.string()),
    property_type: z.string().nullable(),
    price_min: z.number().nullable(),
    price_max: z.number().nullable(),
    furnishing: z
        .enum(["FULLY_FURNISHED", "SEMI_FURNISHED", "UNFURNISHED"])
        .nullable(),
    gender_preference: z.enum(["MALE", "FEMALE", "ANY"]).nullable(),
    pet_preference: z.enum(["ALLOWED", "NOT_ALLOWED", "PREFERRED"]).nullable(),
    food_preference: z
        .enum(["VEGETARIAN_ONLY", "NON_VEG_ALLOWED", "ANY"])
        .nullable(),
    additional_preferences: z.array(z.string()),
    image_url: z.string().nullable().optional(),
    thumbnail_url: z.string().nullable().optional(),
});
const model = google("gemini-3.6-flash");
const activeGeminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY ?? "";
console.log("[DEBUG] listingService Gemini API key:", {
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    activeGeminiKey,
    activeKeyLength: activeGeminiKey.length,
});
function normalizeStoredUrl(value) {
    if (typeof value !== "string")
        return null;
    const cleaned = value
        .trim()
        .replace(/^['"]+|['"]+$/g, "")
        .trim();
    return cleaned.length > 0 ? cleaned : null;
}
const promtp = "";
export const answerMyQuestion = async (prompt, imageUrl) => {
    // Include image URL in the prompt context for better extraction
    const enhancedPrompt = imageUrl
        ? `${prompt}\n\nImage URL: ${imageUrl}`
        : prompt;
    const { output } = await generateText({
        model,
        output: Output.object({
            schema: PostSchema,
        }),
        prompt: `Extract a housing listing from the post below.\n\nReturn IRRELEVANT when it is not a concrete rental, roommate, sublet, or housing-wanted post. Do not infer missing facts. Extract every location mentioned. Prefer the standard Bangalore area spelling when it is clear (for example, \"Koramangala\" rather than \"Kormanagla\").\n\nPost:\n${enhancedPrompt}`,
    });
    // Ensure image_url is set in the output
    if (imageUrl && !output.image_url) {
        output.image_url = imageUrl;
    }
    output.image_url = normalizeStoredUrl(output.image_url) ?? null;
    output.thumbnail_url = normalizeStoredUrl(output.thumbnail_url) ?? null;
    output.location = (await resolveLocationAliases(output.location)) ?? [];
    return output.post_type === "IRRELEVANT" ? null : output;
};
//# sourceMappingURL=listingService.js.map