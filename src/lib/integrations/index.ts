import type { DeliveryStatus } from "@/lib/schema";
import type { NotificationPayload } from "@/lib/integrations/types";
import { sendToSlack } from "@/lib/integrations/slack";
import { appendToSheet } from "@/lib/integrations/sheets";

export type NotifyOutcome = {
  notifications: { slack: DeliveryStatus; sheets: DeliveryStatus };
  warnings: string[];
};

// Sends the result to Slack and Google Sheets at the same time.
// A failing integration never breaks the screening: it becomes a warning instead.
export async function notifyTeam(
  payload: NotificationPayload,
): Promise<NotifyOutcome> {
  const [slack, sheets] = await Promise.allSettled([
    sendToSlack(payload),
    appendToSheet(payload),
  ]);
  const warnings: string[] = [];

  if (slack.status === "rejected") {
    console.error("[notify] Slack failed:", slack.reason);
    warnings.push("The Slack notification could not be sent.");
  }
  if (sheets.status === "rejected") {
    console.error("[notify] Google Sheets failed:", sheets.reason);
    warnings.push("The Google Sheets row could not be added.");
  }

  return {
    notifications: {
      slack: slack.status === "fulfilled" ? slack.value : "failed",
      sheets: sheets.status === "fulfilled" ? sheets.value : "failed",
    },
    warnings,
  };
}
