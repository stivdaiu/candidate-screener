import type { DeliveryStatus } from "@/lib/schema";
import type { NotificationPayload } from "@/lib/integrations/types";

// Text starting with = + - @ would be run as a formula by Google Sheets.
// A CV could contain e.g. =IMPORTXML(...), so we neutralise it ("formula injection").
function safeCell(value: string) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

// Adds one row to the recruiting team's Google Sheet through a Google Apps Script web app.
export async function appendToSheet(
  payload: NotificationPayload,
): Promise<DeliveryStatus> {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!url) return "skipped"; // not configured

  const { result, engine, jobTitle, candidateEmail } = payload;
  const row = {
    candidateName: safeCell(result.candidateName),
    candidateEmail: safeCell(candidateEmail ?? ""),
    jobTitle: safeCell(jobTitle ?? "Custom job"),
    matchScore: result.matchScore,
    recommendation: result.recommendation,
    summary: safeCell(result.summary),
    matchedSkills: safeCell(result.matchedSkills.join(", ")),
    missingSkills: safeCell(result.missingSkills.join(", ")),
    engine,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: process.env.GOOGLE_SHEETS_SECRET, row }),
    signal: AbortSignal.timeout(15_000),
    redirect: "follow", // Apps Script answers through a redirect
  });
  if (!res.ok) {
    throw new Error(`Google Sheets responded with HTTP ${res.status}`);
  }

  const body = await res.json().catch(() => null);
  if (!body?.ok) {
    throw new Error(
      `Google Apps Script error: ${body?.error ?? "unexpected response"}`,
    );
  }
  return "sent";
}
