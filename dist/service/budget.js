// lib/search/normalize/budget.ts
/**
 * Pure regex-based extraction from the ORIGINAL prompt text.
 * This is our source of truth for cross-checking the LLM's output.
 * Handles: "20k", "20,000", "1.5 lakh", "20000 rs", etc.
 */
function extractBudgetFromText(text) {
    const match = text.match(/(\d+(?:[.,]\d+)?)\s*(k|thousand|lakh|l)?/i);
    if (!match)
        return null;
    const rawNumber = match[1];
    let value = parseFloat(rawNumber.replace(",", ""));
    const unit = match[2]?.toLowerCase();
    if (unit === "k" || unit === "thousand")
        value *= 1000;
    if (unit === "lakh" || unit === "l")
        value *= 100000;
    return Math.round(value);
}
const MIN_SANE_BUDGET = 1000; // anything below this is almost certainly a parsing error
const MAX_SANE_BUDGET = 10000000; // anything above this too
export function normalizeBudget(llmOutput, originalPrompt) {
    const flags = [];
    let { min_budget: minBudget, max_budget: maxBudget } = llmOutput;
    // 1. Range sanity check — catch obviously wrong LLM numbers
    for (const [key, val] of [
        ["min_budget", minBudget],
        ["max_budget", maxBudget],
    ]) {
        if (val !== null && (val < MIN_SANE_BUDGET || val > MAX_SANE_BUDGET)) {
            flags.push(`${key}_out_of_range:${val}`);
            if (key === "min_budget")
                minBudget = null;
            else
                maxBudget = null;
        }
    }
    // 2. If LLM gave nothing but the prompt clearly has a number, fall back to regex
    if (minBudget === null && maxBudget === null) {
        const fallback = extractBudgetFromText(originalPrompt);
        if (fallback !== null) {
            flags.push("used_regex_fallback");
            // "under 20k" / "below 20k" implies a ceiling, not a floor
            if (/under|below|less than|max/i.test(originalPrompt)) {
                maxBudget = fallback;
            }
            else if (/above|over|more than|min/i.test(originalPrompt)) {
                minBudget = fallback;
            }
            else {
                maxBudget = fallback; // default assumption: bare number = ceiling
            }
        }
    }
    // 3. Swap if reversed (min > max is always a bug, never valid intent)
    if (minBudget !== null && maxBudget !== null && minBudget > maxBudget) {
        flags.push("swapped_min_max");
        [minBudget, maxBudget] = [maxBudget, minBudget];
    }
    return { minBudget, maxBudget, flags };
}
//# sourceMappingURL=budget.js.map