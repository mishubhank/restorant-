import { supabase } from "../db/client.js";
export async function savePosts(posts) {
    const { data, error } = await supabase.from("raw_posts").insert(posts);
    if (error) {
        console.error("Error inserting posts:", error);
    }
    else {
        console.log("Inserted posts:", data);
    }
}
//# sourceMappingURL=rawPosts.js.map