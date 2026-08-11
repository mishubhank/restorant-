import { generateText, Output } from "ai";
import { z } from "zod";

import { google } from "@ai-sdk/google";
import { normalizeBudget } from "./budget.js";
import { normalizeLocations } from "./locations.js";

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

export async function UserSearchIntent(prompt: string) {
  console.log("using llm to filter user prompts..");
  const { output } = await generateText({
    model,
    output: Output.object({
      schema: SearchIntentSchema,
    }),
    prompt,
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
    location: normalizeLocations(llmOut.location, prompt),
  };

  return normalized;
}
