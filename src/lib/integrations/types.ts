import type { Engine, ScreeningResult } from "@/lib/schema";

// Everything an integration needs to know about one screening.
export type NotificationPayload = {
  result: ScreeningResult;
  engine: Engine;
  jobTitle?: string;
  candidateEmail?: string;
};
