import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// Receives a PDF upload and returns its text, so the screening webhook can stay text-only.
export async function POST(request: Request) {
  // 1. Read the uploaded file
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      {
        error: "Send the PDF as multipart/form-data in a field called 'file'.",
      },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  // 2. Check type and size
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return NextResponse.json(
      { error: "Only PDF files are supported." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File is too large (max 5 MB)." },
      { status: 413 },
    );
  }

  // 3. Extract the text
  try {
    const pdf = await getDocumentProxy(
      new Uint8Array(await file.arrayBuffer()),
    );
    const { totalPages, text } = await extractText(pdf, { mergePages: true });

    const cleaned = text
      .replace(/[ \t]+/g, " ") // collapse repeated spaces
      .replace(/\n{3,}/g, "\n\n") // collapse big gaps
      .trim();

    if (cleaned.length < 50) {
      return NextResponse.json(
        {
          error:
            "No readable text found in this PDF (it may be a scanned image). Please paste the CV text instead.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ text: cleaned, pages: totalPages });
  } catch (err) {
    console.error("[api/extract-cv] failed to read PDF:", err);
    return NextResponse.json(
      {
        error:
          "Could not read this PDF. Please check the file or paste the text instead.",
      },
      { status: 422 },
    );
  }
}
