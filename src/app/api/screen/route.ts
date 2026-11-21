import { NextResponse } from "next/server";
import { ScreenRequestSchema, type ScreenResponse } from "@/lib/schema";
import { screenCandidate } from "@/lib/screen";

export const maxDuration = 60; // seconds allowed on Vercel

export async function POST(request: Request) {
  const startedAt = Date.now();

  // 1. Read the JSON body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  // 2. Validate the input
  const parsed = ScreenRequestSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path.join(".") || "body";
    return NextResponse.json(
      { error: `${field}: ${issue?.message ?? "Invalid request."}` },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // 3. Screen the candidate with AI
  try {
    const { result, engine, warnings } = await screenCandidate(
      input.jobDescription,
      input.cvText,
    );
    if (input.candidateName) result.candidateName = input.candidateName;

    const response: ScreenResponse = {
      result,
      meta: {
        engine,
        durationMs: Date.now() - startedAt,
        notifications: { slack: "skipped", sheets: "skipped" }, // Step 4
        warnings,
      },
    };
    return NextResponse.json(response);
  } catch (err) {
    console.error("[api/screen] screening failed:", err);
    return NextResponse.json(
      { error: "Screening failed. Please try again." },
      { status: 502 },
    );
  }
}

// Simple health check: open /api/screen in the browser to see that it's running.
export function GET() {
  return NextResponse.json({
    status: "ok",
    usage:
      "POST JSON { jobDescription, cvText, candidateName?, candidateEmail?, notify? }",
  });
}
