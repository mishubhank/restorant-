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
    async markProcessed(postId) {
        const { data, error } = await supabase
            .from("raw_posts")
            .update({ is_processed: true })
            .eq("post_id", postId);
        if (error) {
            console.error("Error marking post as processed:", error);
            throw error;
        }
        return data;
    }
    async markIgnore(postId) {
        const { data, error } = await supabase
            .from("raw_posts")
            .update({ is_processed: true, is_ignored: true })
            .eq("post_id", postId);
        if (error) {
            console.error("Error marking post as ignored:", error);
            throw error;
        }
        return data;
    }
}
const repo = new RawPostsRepository();
repo.getPendingRawPosts();
//# sourceMappingURL=rawPosts.repository.js.map