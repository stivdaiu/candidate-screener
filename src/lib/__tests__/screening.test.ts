import { describe, expect, it } from "vitest";
import { keywordScreen } from "@/lib/fallback";
import { recommendationFromScore } from "@/lib/recommendation";
import { ScreenRequestSchema } from "@/lib/schema";
import { SAMPLE_CV, SAMPLE_JOB } from "@/lib/samples";

describe("recommendationFromScore", () => {
  it("applies the shortlist / maybe / reject thresholds", () => {
    expect(recommendationFromScore(100)).toBe("shortlist");
    expect(recommendationFromScore(75)).toBe("shortlist");
    expect(recommendationFromScore(74)).toBe("maybe");
    expect(recommendationFromScore(50)).toBe("maybe");
    expect(recommendationFromScore(49)).toBe("reject");
    expect(recommendationFromScore(0)).toBe("reject");
  });
});

describe("keywordScreen (fallback)", () => {
  it("finds matched and missing skills in the sample data", () => {
    const result = keywordScreen(SAMPLE_JOB, SAMPLE_CV);
    expect(result.candidateName).toBe("Maria Rossi");
    expect(result.matchedSkills).toEqual(
      expect.arrayContaining(["Zapier", "Slack", "Python", "AI tools"]),
    );
    expect(result.missingSkills).toEqual(
      expect.arrayContaining(["n8n", "APIs & webhooks"]),
    );
    expect(result.matchScore).toBeGreaterThan(0);
    expect(result.matchScore).toBeLessThanOrEqual(100);
    expect(result.interviewQuestions).toHaveLength(3);
  });

  it("matches whole words only", () => {
    const job =
      "We need someone who knows APIs and can build integrations quickly for our team.";
    const cv =
      "Jane Doe\nI deliver rapid results and enjoy teamwork in fast-moving companies.";
    const result = keywordScreen(job, cv);
    expect(result.missingSkills).toContain("APIs & webhooks"); // "rapid" must not count as "api"
    expect(result.matchScore).toBe(0);
  });

  it("returns a safe result when the job has no known skills", () => {
    const result = keywordScreen(
      "We are looking for a friendly person to join our wonderful bakery in the city centre.",
      "Not a name line, just some text about baking bread every morning for ten years.",
    );
    expect(result.matchScore).toBe(0);
    expect(result.recommendation).toBe("reject");
    expect(result.candidateName).toBe("Unknown candidate");
    expect(result.interviewQuestions).toHaveLength(3);
  });
});

describe("ScreenRequestSchema", () => {
  it("rejects a CV that is too short", () => {
    const parsed = ScreenRequestSchema.safeParse({
      jobDescription: SAMPLE_JOB,
      cvText: "too short",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts valid input and defaults notify to true", () => {
    const parsed = ScreenRequestSchema.safeParse({
      jobDescription: SAMPLE_JOB,
      cvText: SAMPLE_CV,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.notify).toBe(true);
  });
});
