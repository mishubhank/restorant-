import { supabase } from "../../db/client.js";

export class RawPostsRepository {
  async getPendingRawPosts() {
    console.log("Fetching pending raw posts...");

    const { data, error } = await supabase
      .from("raw_posts")
      .select("*")
      .eq("is_processed", false)
      .limit(10);

    //console.log("DATA:", data);
    console.log("ERROR:", error);

    if (error) {
      console.error("Supabase query failed:", error);
      return { error };
    }

    //console.log("Fetched pending raw posts:", data);
    return data;
  }
  async markProcessed(postId: string) {
    const { data, error } = await supabase
      .from("raw_posts")
      .update({ is_processed: true })
      .eq("post_id", postId);
  }
  async markIgnore(postId: string) {}
}
const repo = new RawPostsRepository();

repo.getPendingRawPosts();
