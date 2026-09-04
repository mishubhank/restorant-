import { generateText, Output } from "ai";
import { z } from "zod";

import { google } from "@ai-sdk/google";
import { normalizeBudget } from "./budget.js";
import { resolveLocationAliases } from "./locations.js";

const SearchIntentSchema = z.object({
  post_type: z.enum(["OFFERING", "SEEKING"]).nullable(),
  location: z.array(z.string()).nullable(),
  min_budget: z.number().nullable(),
  max_budget: z.number().nullable(),
  furnishing: z
    .enum(["FULLY_FURNISHED", "SEMI_FURNISHED", "UNFURNISHED"])
    .nullable(),
  gender_preference: z.enum(["MALE", "FEMALE", "ANY"]).nullable(),
  food_preference: z
    .enum(["VEGETARIAN_ONLY", "NON_VEG_ALLOWED", "ANY"])
    .nullable(),
  needs_clarification: z.boolean().nullable(),

  clarification_question: z.string().nullable(),

  free_text_preferences: z.array(z.string()).nullable(),
});
const model = google("gemini-3.6-flash");
const activeGeminiKey =
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY ?? "";

console.log("[DEBUG] Gemini API key check:", {
  GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  activeGeminiKey,
  activeKeyLength: activeGeminiKey.length,
});

const SEARCH_INTENT_INSTRUCTIONS = `
Extract housing-search filters from the user's message.

Interpret post_type from the USER'S intent:
- SEEKING: the user wants to find a flat, room, roommate, or rental.
- OFFERING: the user wants to find a tenant, flatmate, or renter for a place they have.
- Use null if the direction is genuinely unclear.

Locations are Bangalore area names where possible. Preserve the user's location
text even if its spelling or casing is imperfect; matching is typo-tolerant in
the database. "near Mahadevapura" should produce ["Mahadevapura"]. Do not
invent a location or a budget. Return null for filters the user did not state.

User message:
`;

export async function UserSearchIntent(prompt: string) {
  console.log(process.env.GEMINI_API_KEY, "apikey log");
  console.log("using llm to filter user prompts..");

  const { output } = await generateText({
    model,
    output: Output.object({
      schema: SearchIntentSchema,
    }),
    prompt: `${SEARCH_INTENT_INSTRUCTIONS}\n${prompt}`,
  });

  // Normalize budget using deterministic regex fallback and sanity checks
  const llmOut: any = output;
  const llmBudget = {
    min_budget: llmOut.min_budget ?? null,
    max_budget: llmOut.max_budget ?? null,
  };

  const { minBudget, maxBudget, flags } = normalizeBudget(llmBudget, prompt);

  const normalized = {
    ...llmOut,
    min_budget: minBudget,
    max_budget: maxBudget,
    _llm_budget_flags: flags,
    location: await resolveLocationAliases(llmOut.location),
  };

  return normalized;
}
