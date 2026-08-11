function titleCase(s: string) {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function normalizeLocations(
  llmLocations: string[] | null | undefined,
  prompt?: string,
): string[] | null {
  if (!llmLocations || !llmLocations.length) return null;

  const normalized = llmLocations
    .map((l) => (l || "").trim())
    .filter(Boolean)
    .map((l) => titleCase(l));

  return normalized.length ? normalized : null;
}

export default normalizeLocations;
