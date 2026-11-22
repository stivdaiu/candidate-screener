import { NextResponse } from "next/server";
import { ScreenRequestSchema, type ScreenResponse } from "@/lib/schema";
import { screenCandidate } from "@/lib/screen";
import { notifyTeam } from "@/lib/integrations";
import { findSavedJob } from "@/lib/jobs";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const maxDuration = 60; // seconds allowed on Vercel

export async function POST(request: Request) {
  const startedAt = Date.now();
  // 0. Limit how often one visitor can screen (protects API costs on the public demo)
  const limit = checkRateLimit(`screen:${getClientIp(request)}`);
  if (!limit.allowed) {
    const minutes = Math.ceil(limit.retryAfterSeconds / 60);
    return NextResponse.json(
      {
        error: `Too many screenings. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

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

  // 3. Work out the job: a saved job (by id) or the description that was sent
  let jobDescription = input.jobDescription;
  let jobTitle = input.jobTitle;
  if (input.jobId) {
    const job = findSavedJob(input.jobId);
    if (!job) {
      return NextResponse.json(
        { error: `jobId: unknown job "${input.jobId}".` },
        { status: 400 },
      );
    }
    jobDescription ??= job.description;
    jobTitle ??= job.title;
  }
  if (!jobDescription) {
    return NextResponse.json(
      { error: "jobDescription: missing." },
      { status: 400 },
    );
  }

  try {
    // 4. Screen the candidate with AI (or the fallback)
    const { result, engine, warnings } = await screenCandidate(
      jobDescription,
      input.cvText,
    );
    if (input.candidateName) result.candidateName = input.candidateName;

    // 5. Notify the team in Slack and Google Sheets (unless the caller turned it off)
    const notify = input.notify
      ? await notifyTeam({
          result,
          engine,
          jobTitle,
          candidateEmail: input.candidateEmail,
        })
      : {
          notifications: { slack: "skipped", sheets: "skipped" } as const,
          warnings: [],
        };

    const response: ScreenResponse = {
      result,
      meta: {
        engine,
        durationMs: Date.now() - startedAt,
        notifications: notify.notifications,
        warnings: [...warnings, ...notify.warnings],
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
      "POST JSON { jobDescription or jobId, cvText, candidateName?, candidateEmail?, jobTitle?, notify? }",
  });
}
