import OpenAI from "openai";
import {
  SCREENING_JSON_SCHEMA,
  SYSTEM_PROMPT,
  buildUserPrompt,
} from "@/lib/prompt";

export async function screenWithOpenAI(
  jobDescription: string,
  cvText: string,
): Promise<unknown> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 30_000,
    maxRetries: 1,
  });

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-6.1-terra",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(jobDescription, cvText) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "screening_result",
        strict: true,
        schema: SCREENING_JSON_SCHEMA,
      },
    },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned an empty response.");
  return JSON.parse(content);
}
