import type { DeliveryStatus } from "@/lib/schema";
import type { NotificationPayload } from "@/lib/integrations/types";

const EMOJI = { shortlist: "🟢", maybe: "🟡", reject: "🔴" } as const;

// Slack treats &, < and > as special characters in messages.
function escapeSlack(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function list(items: string[]) {
  return items.length ? escapeSlack(items.join(", ")) : "_none_";
}

// Posts a summary to a Slack channel through an Incoming Webhook.
export async function sendToSlack(
  payload: NotificationPayload,
): Promise<DeliveryStatus> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return "skipped"; // not configured

  const { result, engine, jobTitle, candidateEmail } = payload;
  const rec = result.recommendation;
  const recLabel = rec.charAt(0).toUpperCase() + rec.slice(1);

  const message = {
    // Plain text used in phone notifications
    text: escapeSlack(
      `New candidate screened: ${result.candidateName}, ${result.matchScore}% (${recLabel})`,
    ),
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: truncate(
            `${EMOJI[rec]} ${result.candidateName}: ${result.matchScore}% · ${recLabel}`,
            150,
          ),
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Job:*\n${escapeSlack(jobTitle ?? "Custom job")}`,
          },
          {
            type: "mrkdwn",
            text: `*Email:*\n${escapeSlack(candidateEmail ?? "Not provided")}`,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: truncate(escapeSlack(result.summary), 2900),
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: truncate(
              `*Matched skills:*\n${list(result.matchedSkills)}`,
              1900,
            ),
          },
          {
            type: "mrkdwn",
            text: truncate(
              `*Missing skills:*\n${list(result.missingSkills)}`,
              1900,
            ),
          },
        ],
      },
      {
        type: "context",
        elements: [{ type: "mrkdwn", text: `Screened by: ${engine}` }],
      },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(10_000), // don't wait more than 10 seconds
  });
  if (!res.ok) {
    throw new Error(
      `Slack responded with HTTP ${res.status}: ${await res.text()}`,
    );
  }
  return "sent";
}
