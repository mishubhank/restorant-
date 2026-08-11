import { supabase } from "../db/client.js";
import { generateText, Output } from "ai";
import { z } from "zod";

import { google } from "@ai-sdk/google";
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
});

const model = google("gemini-3.6-flash");

interface llmPost {
  author: string;
  rent: string;
  brokerage: string;
  location: string;
  bhk: Number;
  rawPostId: string;
}
const promtp = "";
export const answerMyQuestion = async (prompt: string) => {
  const { output } = await generateText({
    model,
    output: Output.object({
      schema: PostSchema,
    }),
    prompt,
  });

  return output;
};

interface RawPost {
  post_id: string;
  raw_text: string;
  author?: string;
  source_group?: string;
}

async function filterRawPosts(posts: RawPost[]) {}
