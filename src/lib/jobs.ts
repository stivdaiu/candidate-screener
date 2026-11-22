import { SAMPLE_JOB } from "@/lib/samples";

export type SavedJob = {
  id: string;
  title: string;
  description: string;
};

// Open positions the recruiting team screens for.
// In a real setup these could come from a Google Sheet or the CRM.
export const SAVED_JOBS: SavedJob[] = [
  {
    id: "ai-operations-specialist",
    title: "AI Operations Specialist",
    description: SAMPLE_JOB,
  },
  {
    id: "recruitment-coordinator",
    title: "Recruitment Coordinator",
    description: `Recruitment Coordinator

Job Duties
- Schedule interviews between candidates and hiring managers across time zones
- Keep candidate records up to date in the ATS (applicant tracking system)
- Screen incoming applications and prepare shortlists for recruiters
- Write and post job ads on LinkedIn and job boards
- Send clear, friendly updates to candidates at every stage

Requirements
- Fluent English (C1), written and spoken
- 1+ year in recruiting, HR or an administrative role
- Experience with an ATS (e.g. Greenhouse, Lever, Workable)
- Very organised, with strong attention to detail
- Comfortable with Google Workspace and Slack`,
  },
  {
    id: "customer-support-lead",
    title: "Customer Support Team Lead",
    description: `Customer Support Team Lead

Job Duties
- Lead a team of 6-8 support agents and review their ticket quality
- Track support KPIs (response time, CSAT) and report weekly to management
- Build saved replies and help-centre articles for common questions
- Handle escalated customer issues
- Work with the product team to report recurring bugs

Requirements
- 3+ years in customer support, including 1+ year leading people
- Experience with Zendesk, Intercom or Freshdesk
- Excellent written English (C1)
- Experience using AI tools to speed up support work is a plus
- Able to work US business hours`,
  },
];

// Finds a saved job by its id (e.g. "ai-operations-specialist") or its exact title.
export function findSavedJob(idOrTitle: string): SavedJob | undefined {
  const key = idOrTitle.trim().toLowerCase();
  return SAVED_JOBS.find(
    (job) => job.id === key || job.title.toLowerCase() === key,
  );
}
