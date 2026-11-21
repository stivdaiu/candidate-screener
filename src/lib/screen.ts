import {
  ScreeningResultSchema,
  type Engine,
  type ScreeningResult,
} from "@/lib/schema";
import { screenWithAnthropic } from "@/lib/providers/anthropic";
import { screenWithOpenAI } from "@/lib/providers/openai";
import { recommendationFromScore } from "@/lib/recommendation";
import { keywordScreen } from "@/lib/fallback";

type AiEngine = Exclude<Engine, "keyword-fallback">;

const PROVIDERS: Record<
  AiEngine,
  (job: string, cv: string) => Promise<unknown>
> = {
  anthropic: screenWithAnthropic,
  openai: screenWithOpenAI,
};

const API_KEY_ENV: Record<AiEngine, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
};

const LABEL: Record<AiEngine, string> = {
  anthropic: "Claude",
  openai: "OpenAI",
};

// Primary provider first, the other as backup. Skip providers without an API key.
function providerOrder(): AiEngine[] {
  const order: AiEngine[] =
    process.env.AI_PROVIDER === "openai"
      ? ["openai", "anthropic"]
      : ["anthropic", "openai"];
  return order.filter((engine) => Boolean(process.env[API_KEY_ENV[engine]]));
}

export type ScreenOutcome = {
  result: ScreeningResult;
  engine: Engine;
  warnings: string[];
};

export async function screenCandidate(
  jobDescription: string,
  cvText: string,
): Promise<ScreenOutcome> {
  const warnings: string[] = [];
  const providers = providerOrder();

  for (const engine of providers) {
    try {
      const raw = await PROVIDERS[engine](jobDescription, cvText);

      // Never trust AI output blindly: validate it against the schema.
      const parsed = ScreeningResultSchema.safeParse(raw);
      if (!parsed.success) {
        throw new Error(
          `Invalid AI output: ${parsed.error.issues[0]?.message}`,
        );
      }

      const result = parsed.data;
      result.recommendation = recommendationFromScore(result.matchScore);
      return { result, engine, warnings };
    } catch (err) {
      // Full details go to the server log; the user only sees a short, safe message.
      console.error(`[screen] ${engine} failed:`, err);
      warnings.push(`${LABEL[engine]} was unavailable, so a backup was used.`);
    }
  }

  // Last resort: free keyword matching, so the automation never stops.
  warnings.push(
    providers.length === 0
      ? "No AI provider is configured, so a keyword-based estimate was used."
      : "All AI providers failed, so a keyword-based estimate was used. Please review manually.",
  );
  return {
    result: keywordScreen(jobDescription, cvText),
    engine: "keyword-fallback",
    warnings,
  };
}
