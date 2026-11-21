"use client";

import { useState } from "react";
import type { ScreenResponse } from "@/lib/schema";
import { SAMPLE_CV } from "@/lib/samples";
import { SAVED_JOBS } from "@/lib/jobs";

const BADGE_STYLES: Record<string, string> = {
  shortlist: "bg-green-100 text-green-800",
  maybe: "bg-amber-100 text-amber-800",
  reject: "bg-red-100 text-red-800",
};

function scoreColor(score: number) {
  if (score >= 75) return "text-green-700";
  if (score >= 50) return "text-amber-700";
  return "text-red-700";
}

export default function Home() {
  const [candidateName, setCandidateName] = useState("");
  const [jobId, setJobId] = useState(""); // "" = custom job
  const [jobDescription, setJobDescription] = useState("");
  const [cvText, setCvText] = useState("");
  const [fileInfo, setFileInfo] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ScreenResponse | null>(null);

  function selectJob(id: string) {
    setJobId(id);
    const job = SAVED_JOBS.find((j) => j.id === id);
    setJobDescription(job ? job.description : "");
  }

  function loadSample() {
    setCandidateName("Maria Rossi");
    selectJob(SAVED_JOBS[0].id);
    setCvText(SAMPLE_CV);
    setFileInfo(null);
    setError(null);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the user upload the same file again
    if (!file) return;

    setUploading(true);
    setError(null);
    setFileInfo(null);

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/extract-cv", {
        method: "POST",
        body: form,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error ?? `Upload failed (HTTP ${res.status})`);
      }
      setCvText(json.text);
      setFileInfo(
        `Loaded ${file.name} (${json.pages} page${json.pages === 1 ? "" : "s"})`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch("/api/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateName: candidateName.trim() || undefined,
          jobDescription,
          cvText,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error ?? `Request failed (HTTP ${res.status})`);
      }
      setData(json as ScreenResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 text-slate-900">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold">Candidate Screener</h1>
        <p className="mt-2 text-slate-600">
          Pick a job, upload or paste a CV. AI scores the match, lists matched
          and missing skills, suggests interview questions, and notifies the
          recruiting team in Slack and Google Sheets.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <label htmlFor="candidateName" className="text-sm font-medium">
              Candidate name (optional)
            </label>
            <input
              id="candidateName"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              placeholder="e.g. Maria Rossi"
            />
          </div>
          <button
            type="button"
            onClick={loadSample}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            Load sample data
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Job column */}
          <div>
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="jobDescription" className="text-sm font-medium">
                Job description
              </label>
              <select
                value={jobId}
                onChange={(e) => selectJob(e.target.value)}
                className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                aria-label="Saved jobs"
              >
                <option value="">Custom job (paste below)</option>
                {SAVED_JOBS.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              id="jobDescription"
              value={jobDescription}
              onChange={(e) => {
                setJobDescription(e.target.value);
                setJobId(""); // edited by hand, so it's now a custom job
              }}
              rows={14}
              className="mt-1 w-full rounded-md border border-slate-300 p-3 font-mono text-sm"
              placeholder="Pick a saved job or paste a job description..."
              required
            />
          </div>

          {/* CV column */}
          <div>
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="cvText" className="text-sm font-medium">
                Candidate CV
              </label>
              <label
                className={`cursor-pointer rounded-md border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50 ${
                  uploading ? "pointer-events-none opacity-50" : ""
                }`}
              >
                {uploading ? "Reading PDF..." : "Upload PDF"}
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
            <textarea
              id="cvText"
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              rows={14}
              className="mt-1 w-full rounded-md border border-slate-300 p-3 font-mono text-sm"
              placeholder="Upload a PDF or paste the CV text..."
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              {fileInfo ?? (
                <>
                  No CV handy?{" "}
                  <a href="/sample-cv.pdf" download className="underline">
                    Download a sample CV (PDF)
                  </a>
                </>
              )}
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || uploading}
          className="rounded-md bg-slate-900 px-5 py-2.5 font-medium text-white disabled:opacity-50"
        >
          {loading ? "Screening..." : "Screen candidate"}
        </button>
      </form>

      {error && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      {data && (
        <section className="mt-8 rounded-xl border border-slate-200 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">
                {data.result.candidateName}
              </h2>
              <p className="text-sm text-slate-500">
                Engine: {data.meta.engine} · {data.meta.durationMs} ms · Slack:{" "}
                {data.meta.notifications.slack} · Sheets:{" "}
                {data.meta.notifications.sheets}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-4xl font-bold ${scoreColor(data.result.matchScore)}`}
              >
                {data.result.matchScore}%
              </span>
              <span
                className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${
                  BADGE_STYLES[data.result.recommendation]
                }`}
              >
                {data.result.recommendation}
              </span>
            </div>
          </div>

          <p className="mt-4 text-slate-700">{data.result.summary}</p>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="font-medium">Matched skills</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {data.result.matchedSkills.map((s) => (
                  <li
                    key={s}
                    className="rounded-full bg-green-50 px-3 py-1 text-sm text-green-800"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium">Missing skills</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {data.result.missingSkills.map((s) => (
                  <li
                    key={s}
                    className="rounded-full bg-red-50 px-3 py-1 text-sm text-red-800"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-medium">Suggested interview questions</h3>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-700">
              {data.result.interviewQuestions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ol>
          </div>

          {data.meta.warnings.length > 0 && (
            <div className="mt-6 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              {data.meta.warnings.map((w) => (
                <p key={w}>⚠ {w}</p>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
