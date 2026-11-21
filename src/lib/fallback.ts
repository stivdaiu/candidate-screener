import type { ScreeningResult } from "@/lib/schema";
import { recommendationFromScore } from "@/lib/recommendation";

// Free, offline backup used when every AI provider fails.
// It looks for known skills in the job description, then checks which ones the CV mentions.

type Skill = { name: string; aliases: string[] };

const SKILLS: Skill[] = [
  // Automation & integration
  { name: "Zapier", aliases: ["zapier"] },
  { name: "Make", aliases: ["make.com", "integromat"] }, // "make" alone is a common English word
  { name: "n8n", aliases: ["n8n"] },
  {
    name: "APIs & webhooks",
    aliases: ["api", "apis", "rest api", "webhook", "webhooks"],
  },
  {
    name: "CRM",
    aliases: ["crm", "hubspot", "salesforce", "pipedrive", "zoho"],
  },
  {
    name: "Google Workspace",
    aliases: [
      "google workspace",
      "g suite",
      "google sheets",
      "google docs",
      "gmail",
      "google drive",
    ],
  },
  { name: "Slack", aliases: ["slack"] },
  { name: "Excel", aliases: ["excel", "spreadsheets"] },
  // AI
  {
    name: "AI tools",
    aliases: [
      "chatgpt",
      "claude",
      "gemini",
      "openai",
      "llm",
      "llms",
      "gpt",
      "copilot",
    ],
  },
  {
    name: "Prompt writing",
    aliases: ["prompt", "prompts", "prompt writing", "prompt engineering"],
  },
  // Coding
  { name: "Python", aliases: ["python"] },
  {
    name: "JavaScript",
    aliases: ["javascript", "typescript", "node.js", "nodejs"],
  },
  { name: "SQL", aliases: ["sql", "postgresql", "mysql"] },
  // Support & recruiting
  {
    name: "Customer support",
    aliases: ["customer support", "support agent", "support team", "tickets"],
  },
  { name: "Help desk software", aliases: ["zendesk", "intercom", "freshdesk"] },
  {
    name: "Recruiting",
    aliases: ["recruiting", "recruitment", "recruiter", "sourcing", "hiring"],
  },
  {
    name: "ATS",
    aliases: ["ats", "applicant tracking", "greenhouse", "lever", "workable"],
  },
  {
    name: "Interview scheduling",
    aliases: ["schedule interviews", "interview scheduling", "calendly"],
  },
  // General
  {
    name: "Training staff",
    aliases: ["training", "trained", "teach", "onboarding"],
  },
  {
    name: "Documentation",
    aliases: [
      "documentation",
      "guide",
      "guides",
      "knowledge base",
      "help-centre",
      "help center",
      "faq",
    ],
  },
  {
    name: "Reporting & KPIs",
    aliases: [
      "reporting",
      "reports",
      "kpi",
      "kpis",
      "dashboard",
      "dashboards",
      "analytics",
    ],
  },
  {
    name: "Team leadership",
    aliases: [
      "team lead",
      "led a team",
      "lead a team",
      "leading people",
      "leadership",
      "managed a team",
    ],
  },
  { name: "English", aliases: ["english"] },
  {
    name: "US business hours",
    aliases: ["us business hours", "us hours", "est", "pst"],
  },
];

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Whole-word, case-insensitive match ("api" must not match "rapid").
function mentions(text: string, alias: string) {
  return new RegExp(
    `(?<![a-z0-9])${escapeRegExp(alias)}(?![a-z0-9])`,
    "i",
  ).test(text);
}

function hasSkill(text: string, skill: Skill) {
  return skill.aliases.some((alias) => mentions(text, alias));
}

// The first line of a CV is usually the name, e.g. "Maria Rossi".
function guessName(cvText: string) {
  const firstLine =
    cvText
      .split("\n")
      .map((l) => l.trim())
      .find(Boolean) ?? "";
  const looksLikeName =
    /^[\p{L}][\p{L}'’.-]*(\s+[\p{L}][\p{L}'’.-]*){1,3}$/u.test(firstLine);
  return looksLikeName ? firstLine : "Unknown candidate";
}

export function keywordScreen(
  jobDescription: string,
  cvText: string,
): ScreeningResult {
  const required = SKILLS.filter((skill) => hasSkill(jobDescription, skill));
  const matched = required
    .filter((skill) => hasSkill(cvText, skill))
    .map((s) => s.name);
  const missing = required
    .filter((skill) => !hasSkill(cvText, skill))
    .map((s) => s.name);

  const matchScore =
    required.length === 0
      ? 0
      : Math.round((matched.length / required.length) * 100);

  const questions = missing
    .slice(0, 3)
    .map((skill) => `Can you describe any experience you have with ${skill}?`);
  const generic = [
    "Walk me through the project you are most proud of and your exact role in it.",
    "Tell me about a time something you built broke. How did you find and fix the problem?",
    "Why are you interested in this role, and what would you focus on in your first month?",
  ];
  while (questions.length < 3) questions.push(generic[questions.length]);

  const summary =
    required.length === 0
      ? "Keyword estimate: no known skills were found in the job description, so no score could be calculated. Please review this CV manually."
      : `Keyword estimate: the CV mentions ${matched.length} of ${required.length} skills found in the job description. This is a simple keyword check, not an AI assessment, so please review manually.`;

  return {
    candidateName: guessName(cvText),
    matchScore,
    recommendation: recommendationFromScore(matchScore),
    summary,
    matchedSkills: matched,
    missingSkills: missing,
    interviewQuestions: questions,
  };
}
