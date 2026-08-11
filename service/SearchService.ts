import { UserSearchIntent } from "./UserPromt.js";

import { RankingService } from "./rankingService.js";
import { ListingRepository } from "../src/repository/listing.repository.js";
const lisitinRep = new ListingRepository();
const rankingService = new RankingService();
export async function Search(userPrompt: string) {
  if (typeof userPrompt !== "string" || !userPrompt.trim()) {
    throw new Error("Invalid user prompt");
  }

  const filteredPrompt = await UserSearchIntent(userPrompt);

  const searchIntent = { ...filteredPrompt };
  if (filteredPrompt.post_type === "SEEKING") {
    searchIntent.post_type = "OFFERING";
  } else if (filteredPrompt.post_type === "OFFERING") {
    searchIntent.post_type = "SEEKING";
  }

  const listing = await lisitinRep.searchIntent(searchIntent);
  const ranking = await rankingService.rankResults(listing);

  return {
    intent: filteredPrompt,
    searchIntent,
    results: ranking,
  };
}
