import Anthropic from "@anthropic-ai/sdk";
import {
  SCREENING_JSON_SCHEMA,
  SYSTEM_PROMPT,
  buildUserPrompt,
} from "@/lib/prompt";

export async function screenWithAnthropic(
  jobDescription: string,
  cvText: string,
): Promise<unknown> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: 30_000, // give up after 30 seconds
    maxRetries: 1, // retry once on network errors
  });

  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      { role: "user", content: buildUserPrompt(jobDescription, cvText) },
    ],
    output_config: {
      effort: "low", // screening is a focused task: faster and cheaper
      format: { type: "json_schema", schema: SCREENING_JSON_SCHEMA }, // structured output
    },
  });

  // The answer is a text block containing JSON that matches our schema.
  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error(
      `Claude returned no text (stop_reason: ${response.stop_reason}).`,
    );
  }
  return JSON.parse(textBlock.text);
}
