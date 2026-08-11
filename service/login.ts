import "dotenv/config";
import { chromium } from "playwright";
import fs from "node:fs";
//import { supabase } from "../db/client.js";
const SESSION_FILE = "facebook-session.json";
const GROUP_URL =
  "https://www.facebook.com/groups/838402552906457/?sorting_setting=CHRONOLOGICAL";
import { savePosts } from "../db/rawPosts.js";
interface RawPost {
  post_id: string; // not postId
  raw_text: string;
  author?: string;
  source_group?: string;
}
async function main() {
  const browser = await chromium.launch({ headless: false });

  let context;

  if (!fs.existsSync(SESSION_FILE)) {
    console.log("No session found. Logging in...");
    context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("https://www.facebook.com/login");
    await page.fill('input[name="email"]', "8959416033");
    await page.fill('input[name="pass"]', "mishraji@123");
    await page.getByRole("button", { name: "Log in" }).click();

    console.log("--------------------------------");
    console.log("Solve CAPTCHA manually.");
    console.log("After Facebook Home opens...");
    console.log("Press ENTER in terminal.");
    console.log("--------------------------------");

    await new Promise<void>((resolve) => {
      process.stdin.resume();
      process.stdin.once("data", () => resolve());
    });

    await context.storageState({ path: SESSION_FILE });
    console.log("Session Saved!");
    await page.close();
  }

  context = await browser.newContext({ storageState: SESSION_FILE });
  const page = await context.newPage();

  // Track posts we've already logged, and count how many "new" posts
  // came in on the most recent scroll (used to detect we've hit the end).
  const seenPostIds = new Set<string>();
  let sinceLastNewPost = 0;

  function findPostText(obj: any): string | null {
    let longest: string | null = null;

    function walk(node: any) {
      if (!node || typeof node !== "object") return;

      if (typeof node.text === "string" && node.text.trim().length > 20) {
        if (!longest || node.text.length > longest.length) {
          longest = node.text;
        }
      }

      for (const value of Object.values(node)) {
        walk(value);
      }
    }

    walk(obj);
    return longest;
  }
  page.on("response", async (response) => {
    if (!response.url().includes("/api/graphql")) return;

    const body = response.request().postData() || "";
    const params = new URLSearchParams(body);
    const operation = params.get("fb_api_req_friendly_name");

    try {
      const rawText = await response.text();
      const lines = rawText.split("\n").filter((l) => l.trim());

      for (const line of lines) {
        let json;
        try {
          json = JSON.parse(line);
        } catch {
          continue;
        }

        const edges = json?.data?.node?.group_feed?.edges ?? [];

        for (const edge of edges) {
          const story = edge.node;
          const postId = story?.post_id;

          // Skip if we've already logged this post
          if (postId && seenPostIds.has(postId)) continue;
          if (postId) seenPostIds.add(postId);

          sinceLastNewPost = 0; // got a new post, reset the "stall" counter
          /// rX*RqNnS$dnjR@4
          console.log("--------------------------------");
          console.log("Op:", operation);
          console.log("Author:", story?.feedback?.owning_profile?.name);
          console.log("Post:", findPostText(story) ?? "NOT FOUND");
          console.log("Post ID:", postId);
          collectedPosts.push({
            post_id: postId,
            author: story?.feedback?.owning_profile?.name,
            raw_text: findPostText(story) ?? "NOT FOUND",
            source_group: story?.feedback?.owning_profile?.name,
          });
        }
      }
    } catch (err) {
      console.error("GraphQL parse error:", err);
    }
  });

  console.log("Opening group...");
  await page.goto(GROUP_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[role="feed"]', { timeout: 15000 }).catch(() => {
    console.log("Feed selector not found in time — continuing anyway.");
  });
  // MAIN SCROLL LOOP
  const collectedPosts: RawPost[] = [];
  // -----------------------------
  try {
    while (true) {
      const moreButtons = page.getByRole("button", {
        name: /see more|show more posts|view more/i,
      });
      const count = await moreButtons.count().catch(() => 0);
      for (let i = 0; i < count; i++) {
        try {
          await moreButtons.nth(i).click({ timeout: 1000 });
          await page.waitForTimeout(500);
        } catch {
          // button may have detached/disappeared, ignore
        }
      }

      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight * 1.5);
      });

      // Give GraphQL responses time to land after the scroll.
      await page.waitForTimeout(2500 + Math.random() * 1500);

      sinceLastNewPost++;
      if (sinceLastNewPost > 15) {
        console.log(
          "No new posts in a while — possibly reached the end, or feed stalled.",
        );
        sinceLastNewPost = 0;
      }
    }
  } catch (err) {
    console.error("Scroll loop stopped:", err);
  } finally {
    console.log(`Done. Total unique posts collected: ${seenPostIds.size}`);
    await savePosts(collectedPosts);
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}
//async function savePosts(posts:any[]){

main().catch(console.error);
