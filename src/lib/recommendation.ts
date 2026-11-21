import type { ScreeningResult } from "@/lib/schema";

// Business rule enforced in code, not left to the AI.
export function recommendationFromScore(
  score: number,
): ScreeningResult["recommendation"] {
  if (score >= 75) return "shortlist";
  if (score >= 50) return "maybe";
  return "reject";
}
