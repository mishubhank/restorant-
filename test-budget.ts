import { Search } from "./service/SearchService.ts";

const prompts = [
  "find flat near sarjapur under 20k",
  "find flat near sarjapur 20000",
  "find flat near sarjapur 20 000",
  "find flat near sarjapur 1.5 lakh",
  "looking for a place in sarjapur between 12k and 18k",
];

async function run() {
  for (const p of prompts) {
    try {
      console.log("--- prompt:", p);
      const res = await Search(p);
      console.log(JSON.stringify(res, null, 2));
    } catch (err) {
      console.error("error for prompt", p, err);
    }
  }
}

run();
