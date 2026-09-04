import { RawPostsRepository } from "../src/repository/rawPosts.repository.js";
import { ListingRepository } from "../src/repository/listing.repository.js";
const rawPostsRepository = new RawPostsRepository();
const listingsRepository = new ListingRepository();
import { answerMyQuestion } from "./listingService.js";

function normalizeStoredUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const cleaned = value
    .trim()
    .replace(/^['"]+|['"]+$/g, "")
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

async function processRawPosts() {
  const rawPosts = await rawPostsRepository.getPendingRawPosts();

  if (!Array.isArray(rawPosts)) {
    throw new Error("Could not load pending raw posts");
  }

  for (const post of rawPosts) {
    // Extract first image from the image_url array if available
    const imageUrl = Array.isArray(post.image_url)
      ? post.image_url[0]
      : post.image_url;
    const normalizedImageUrl = normalizeStoredUrl(imageUrl);
    const normalizedSourceUrl = normalizeStoredUrl(post.post_link);

    const listing = await answerMyQuestion(
      post.raw_text,
      normalizedImageUrl ?? undefined,
    );
    // `answerMyQuestion` returns null only after the structured LLM result has
    // explicitly classified the post as IRRELEVANT.
    if (!listing) {
      await rawPostsRepository.markIgnore(post.post_id);
      continue;
    }

    console.log("Processed listing:", listing);

    try {
      await listingsRepository.saveListing({
        ...listing,
        raw_post_id: post.post_id,
        image_url: normalizedImageUrl,
        source_post_url:
          normalizedSourceUrl && normalizedSourceUrl.startsWith("http")
            ? normalizedSourceUrl
            : null,
        source_author: post.author ?? null,
      });

      // Mark as processed only after successful save
      await rawPostsRepository.markProcessed(post.post_id);
      console.log(
        "✓ Listing saved and marked as processed for post:",
        post.post_id,
      );
    } catch (error: any) {
      if (error?.code === "23505") {
        // Duplicate key error - mark as processed anyway
        console.warn(
          `⚠️ Duplicate listing for post ${post.post_id}, marking as processed`,
        );
        await rawPostsRepository.markProcessed(post.post_id);
      } else {
        console.error(
          `❌ Error saving listing for post ${post.post_id}:`,
          error?.message,
        );
        // Don't mark as processed on other errors - allow retry
      }
    }
  }
}

processRawPosts().catch((error) => {
  console.error("Error processing raw posts:", error);
});
