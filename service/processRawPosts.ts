import { RawPostsRepository } from "../src/repository/rawPosts.repository.js";
import { ListingRepository } from "../src/repository/listing.repository.js";
const rawPostsRepository = new RawPostsRepository();
const listingsRepository = new ListingRepository();
import { answerMyQuestion } from "./listingService.js";

async function processRawPosts() {
  const rawPosts: any = await rawPostsRepository.getPendingRawPosts();

  for (const post of rawPosts) {
    const listing = await answerMyQuestion(post.raw_text);
    if (!listing) {
      await rawPostsRepository.markIgnore(post.post_id);
      continue;
    }

    console.log("Processed listing:", listing);
    await listingsRepository.saveListing({
      ...listing,
      raw_post_id: post.post_id,
    });

    await rawPostsRepository.markProcessed(post.is_processed);
  }
}

processRawPosts().catch((error) => {
  console.error("Error processing raw posts:", error);
});
