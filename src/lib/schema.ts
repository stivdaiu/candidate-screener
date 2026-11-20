import { z } from "zod";

export const ScreenRequestSchema = z.object({
  jobDescription: z
    .string()
    .trim()
    .min(50, "Job description is too short (minimum 50 characters).")
    .max(20000, "Job description is too long."),
  cvText: z
    .string()
    .trim()
    .min(50, "CV is too short (minimum 50 characters).")
    .max(30000, "CV is too long."),
  candidateName: z.string().trim().max(120).optional(),
  candidateEmail: z.string().trim().email("Invalid email.").optional(),
  notify: z.boolean().default(true), // send to Slack / Sheets?
});
export type ScreenRequest = z.infer<typeof ScreenRequestSchema>;

export const ScreeningResultSchema = z.object({
  candidateName: z.string(),
  matchScore: z.number().int().min(0).max(100),
  recommendation: z.enum(["shortlist", "maybe", "reject"]),
  summary: z.string(),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  interviewQuestions: z.array(z.string()),
});
export type ScreeningResult = z.infer<typeof ScreeningResultSchema>;

export type Engine = "anthropic" | "openai" | "keyword-fallback";
export type DeliveryStatus = "sent" | "skipped" | "failed";

// Full API response
export type ScreenResponse = {
  result: ScreeningResult;
  meta: {
    engine: Engine;
    durationMs: number;
    notifications: { slack: DeliveryStatus; sheets: DeliveryStatus };
    warnings: string[];
  };
};
