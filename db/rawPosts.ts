import { supabase } from "../db/client.js";

interface RawPost {
  post_id: string;
  raw_text: string;
  author?: string;
  source_group?: string;
}

export async function savePosts(posts: RawPost[]) {
  const { data, error } = await supabase.from("raw_posts").insert(posts);
  if (error) {
    console.error("Error inserting posts:", error);
  } else {
    console.log("Inserted posts:", data);
  }
}
