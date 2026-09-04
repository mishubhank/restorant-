import "dotenv/config";
import { chromium } from "playwright";
import fs from "node:fs";
import { supabase } from "../db/client.js";
const SESSION_FILE = "facebook-session.json";
const GROUP_URL = "https://www.facebook.com/groups/838402552906457/?sorting_setting=CHRONOLOGICAL";
const GROUP_PATH_PARTS = new URL(GROUP_URL).pathname.split("/").filter(Boolean);
const GROUP_ID = GROUP_PATH_PARTS[GROUP_PATH_PARTS.length - 1];
const IMAGE_BUCKET = "listing-images";
import { savePosts } from "../db/rawPosts.js";
async function main() {
    const browser = await chromium.launch({ headless: false });
    let context;
    if (!fs.existsSync(SESSION_FILE)) {
        const facebookEmail = process.env.FACEBOOK_EMAIL;
        const facebookPassword = process.env.FACEBOOK_PASSWORD;
        if (!facebookEmail || !facebookPassword) {
            throw new Error("Set FACEBOOK_EMAIL and FACEBOOK_PASSWORD in .env before logging in.");
        }
        console.log("No session found. Logging in...");
        context = await browser.newContext();
        const page = await context.newPage();
        await page.goto("https://www.facebook.com/login");
        await page.fill('input[name="email"]', facebookEmail);
        await page.fill('input[name="pass"]', facebookPassword);
        await page.getByRole("button", { name: "Log in" }).click();
        console.log("--------------------------------");
        console.log("Solve CAPTCHA manually.");
        console.log("After Facebook Home opens...");
        console.log("Press ENTER in terminal.");
        console.log("--------------------------------");
        await new Promise((resolve) => {
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
    function findPostImages(story) {
        const images = new Set();
        const attachments = story?.attachments ??
            story?.comet_sections?.content?.story?.attachments ??
            [];
        function walk(node) {
            if (!node || typeof node !== "object")
                return;
            if (node.image?.uri)
                images.add(node.image.uri);
            for (const value of Object.values(node)) {
                Array.isArray(value) ? value.forEach(walk) : walk(value);
            }
        }
        attachments.forEach(walk);
        return Array.from(images);
    }
    function findPostLink(story, postId) {
        // Try direct fields FB sometimes provides
        if (typeof story?.wwwURL === "string")
            return story.wwwURL;
        if (typeof story?.url === "string")
            return story.url;
        // Fallback: construct manually from group + post id
        if (postId && GROUP_ID) {
            return `https://www.facebook.com/groups/${GROUP_ID}/posts/${postId}/`;
        }
        return null;
    }
    async function persistImages(imageUrls, postId) {
        const storedUrls = await Promise.all(imageUrls.slice(0, 5).map(async (imageUrl, index) => {
            try {
                // Uses the Playwright browser context, which has the Facebook
                // session cookies needed to download signed CDN image URLs.
                const imageResponse = await context.request.get(imageUrl);
                if (!imageResponse.ok()) {
                    console.warn(`Could not download image for ${postId}: ${imageResponse.status()}`);
                    return null;
                }
                const contentType = imageResponse.headers()["content-type"]?.split(";")[0] ??
                    "image/jpeg";
                const extension = contentType.includes("png") ? "png" : "jpg";
                const path = `${postId}/${index}.${extension}`;
                const { error } = await supabase.storage
                    .from(IMAGE_BUCKET)
                    .upload(path, await imageResponse.body(), {
                    contentType,
                    upsert: true,
                });
                if (error) {
                    console.warn(`Could not store image for ${postId}:`, error.message);
                    return null;
                }
                return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data
                    .publicUrl;
            }
            catch (error) {
                console.warn(`Could not persist image for ${postId}:`, error);
                return null;
            }
        }));
        return storedUrls.filter((url) => Boolean(url));
    }
    const seenPostIds = new Set();
    let sinceLastNewPost = 0;
    function findPostText(obj) {
        let longest = null;
        function walk(node) {
            if (!node || typeof node !== "object")
                return;
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
        if (!response.url().includes("/api/graphql"))
            return;
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
                }
                catch {
                    continue;
                }
                const edges = json?.data?.node?.group_feed?.edges ?? [];
                for (const edge of edges) {
                    const story = edge.node;
                    const postId = story?.post_id;
                    // Skip if we've already logged this post
                    if (postId && seenPostIds.has(postId))
                        continue;
                    if (postId)
                        seenPostIds.add(postId);
                    sinceLastNewPost = 0; // got a new post, reset the "stall" counter
                    console.log("--------------------------------");
                    console.log("Op:", operation);
                    console.log("Author:", story?.feedback?.owning_profile?.name);
                    console.log("Post:", findPostText(story) ?? "NOT FOUND");
                    console.log("Post ID:", postId);
                    const imageUrls = await persistImages(findPostImages(story), postId);
                    const postLink = findPostLink(story, postId);
                    collectedPosts.push({
                        post_id: postId,
                        author: story?.feedback?.owning_profile?.name,
                        raw_text: findPostText(story) ?? "NOT FOUND",
                        source_group: GROUP_URL,
                        image_url: imageUrls,
                        ...(postLink ? { post_link: postLink } : {}),
                    });
                }
            }
        }
        catch (err) {
            console.error("GraphQL parse error:", err);
        }
    });
    console.log("Opening group...");
    await page.goto(GROUP_URL, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[role="feed"]', { timeout: 15000 }).catch(() => {
        console.log("Feed selector not found in time — continuing anyway.");
    });
    // MAIN SCROLL LOOP
    const collectedPosts = [];
    // -----------------------------
    // -----------------------------
    try {
        while (true) {
            // Bail out of any unexpected modal/dialog (e.g. comment lightbox) before continuing
            const dialog = page.getByRole("dialog");
            if ((await dialog.count().catch(() => 0)) > 0) {
                console.log("Unexpected dialog/modal detected — closing it.");
                await page.keyboard.press("Escape").catch(() => { });
                await page.waitForTimeout(500);
            }
            // Only expand "See more" on truncated POST text, scoped per-post
            const postArticles = page.locator('[role="article"]');
            const articleCount = await postArticles.count().catch(() => 0);
            for (let a = 0; a < articleCount; a++) {
                const article = postArticles.nth(a);
                const moreButtons = article.getByRole("button", {
                    name: /^see more$/i,
                });
                const count = await moreButtons.count().catch(() => 0);
                for (let i = 0; i < count; i++) {
                    try {
                        await moreButtons.nth(i).click({ timeout: 1000 });
                        await page.waitForTimeout(500);
                    }
                    catch {
                        // button may have detached/disappeared, ignore
                    }
                }
            }
            await page.evaluate(() => {
                window.scrollBy(0, window.innerHeight * 1.5);
            });
            // Give GraphQL responses time to land after the scroll.
            await page.waitForTimeout(2500 + Math.random() * 1500);
            sinceLastNewPost++;
            if (sinceLastNewPost > 15) {
                console.log("No new posts in a while — possibly reached the end, or feed stalled.");
                sinceLastNewPost = 0;
            }
        }
    }
    catch (err) {
        console.error("Scroll loop stopped:", err);
    }
    finally {
        console.log(`Done. Total unique posts collected: ${seenPostIds.size}`);
        await savePosts(collectedPosts);
        await context.close().catch(() => { });
        await browser.close().catch(() => { });
    }
}
//async function savePosts(posts:any[]){
main().catch(console.error);
//# sourceMappingURL=login.js.map