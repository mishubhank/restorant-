import express from "express";
const app = express();
import dotenv from "dotenv";
dotenv.config();
import { Search } from "../service/SearchService.js";
import { getCanonicalLocation, createCanonicalLocation, searchCanonicalLocations, } from "../service/locations.js";
import cors from "cors";
app.use(express.json());
app.use(cors());
const corsOption = {
    origin: "*",
};
app.get("/locations", cors(corsOption), async (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (query.length < 2)
        return res.json({ locations: [] });
    try {
        return res.json({ locations: await searchCanonicalLocations(query) });
    }
    catch (error) {
        console.error("Location search failed:", error);
        return res.status(500).json({ error: "Could not search locations" });
    }
});
app.post("/locations", cors(corsOption), async (req, res) => {
    const name = typeof req.body?.name === "string" ? req.body.name : "";
    const city = typeof req.body?.city === "string" ? req.body.city : "Bengaluru";
    if (!name.trim())
        return res.status(400).json({ error: "Location name is required" });
    try {
        return res.status(201).json({ location: await createCanonicalLocation(name, city) });
    }
    catch (error) {
        console.error("Location creation failed:", error);
        return res.status(500).json({ error: "Could not save location" });
    }
});
app.post("/findflat", cors(corsOption), async (req, res) => {
    const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
    if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
    }
    try {
        const locationId = req.body?.locationId == null ? null : Number(req.body.locationId);
        if (locationId !== null && !Number.isInteger(locationId)) {
            return res.status(400).json({ error: "locationId must be an integer" });
        }
        const selectedLocation = locationId === null ? null : await getCanonicalLocation(locationId);
        if (locationId !== null && !selectedLocation) {
            return res.status(400).json({ error: "Unknown locationId" });
        }
        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders?.();
        const result = await Search(prompt, selectedLocation);
        // Send message first
        res.write(`data: ${JSON.stringify({ type: "message", content: result.message })}\n\n`);
        await new Promise((resolve) => setTimeout(resolve, 100));
        // Stream each listing individually
        if (result.listings && result.listings.length > 0) {
            for (const listing of result.listings) {
                res.write(`data: ${JSON.stringify({ type: "listing", data: listing })}\n\n`);
                await new Promise((resolve) => setTimeout(resolve, 50));
            }
        }
        res.write("data: [DONE]\n\n");
        res.end();
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Request failed";
        res.write(`data: ${JSON.stringify({ type: "error", content: message })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
    }
});
app.listen(3001, () => {
    console.log("Server is running on port 3001");
});
//# sourceMappingURL=server.js.map