/**
 * Google Apps Script web app: receives screening results and adds them to this Google Sheet.
 *
 * Setup:
 * 1. Open your Google Sheet → Extensions → Apps Script, and paste this file.
 * 2. Change SECRET below to a long random string (the same value goes in GOOGLE_SHEETS_SECRET).
 * 3. Deploy → New deployment → type "Web app" → Execute as "Me" → Who has access "Anyone".
 * 4. Copy the web app URL into GOOGLE_SHEETS_WEBHOOK_URL.
 */

const SECRET = "change-me-to-a-long-random-string";
const SHEET_NAME = "Candidates";
const HEADERS = [
  "Date",
  "Candidate",
  "Email",
  "Job",
  "Score",
  "Recommendation",
  "Summary",
  "Matched skills",
  "Missing skills",
  "Engine",
];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // Only accept requests that know the shared secret
    if (data.secret !== SECRET) {
      return json({ ok: false, error: "unauthorized" });
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet =
      spreadsheet.getSheetByName(SHEET_NAME) ||
      spreadsheet.insertSheet(SHEET_NAME);

    // Add the header row the first time
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }

    const r = data.row;
    sheet.appendRow([
      new Date(),
      r.candidateName,
      r.candidateEmail,
      r.jobTitle,
      r.matchScore,
      r.recommendation,
      r.summary,
      r.matchedSkills,
      r.missingSkills,
      r.engine,
    ]);

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
