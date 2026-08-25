# Bureaucracy Action Agent

> We don't summarize bureaucracy. We turn it into executable actions.

Google All Things Agentic Hackathon — Taskmaster track.

## Problem

Official documents (university letters, government notices, immigration paperwork)
tell people what an institution wants, but rarely make the next steps obvious:
what to do, in what order, and by when.

## Solution

Upload a document. The agent reads it, extracts required actions, deadlines,
required documents, and dependencies between tasks, assigns priority, and
persists the resulting action plan to Firestore — displayed as a task dashboard.

## Architecture

```text
Next.js UI  ->  FastAPI (Cloud Run)  ->  Google ADK agent  ->  Gemini
                                                |
                                                v
                                    extract -> validate -> save
                                                |
                                                v
                                            Firestore
```

## How It Works

1. User uploads a PDF.
2. Backend extracts raw text from the PDF.
3. Agent tool `extract_document_actions` calls Gemini with structured output
   to produce a summary, tasks, deadlines, and required documents.
4. Agent tool `validate_tasks` deduplicates and sanity-checks the tasks.
5. Agent tool `save_tasks` writes the validated tasks to Firestore.
6. The UI displays the resulting action plan as a task dashboard.

## Agent Tools

- `extract_document_actions(document_text)` — document text -> structured summary/tasks/deadlines.
- `validate_tasks(actions)` — dedupe, normalize dates, flag missing information.
- `save_tasks(document_id, tasks)` — persist validated tasks to Firestore.

## Google Technologies Used

- Gemini (structured output)
- Google ADK (agent orchestration)
- Firestore (task/document storage)
- Cloud Run (deployment)

## Firestore Data Model

See `backend/app/models/schemas.py` for the task/document shape.

## Local Setup

### Backend

```bash
cd backend
python -m venv venv
venv/Scripts/activate   # Windows
pip install -r requirements.txt
cp .env.example .env    # fill in GEMINI_API_KEY and GOOGLE_CLOUD_PROJECT
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Cloud Deployment

TODO (Day 5): deploy backend and frontend to Google Cloud Run.

## Limitations

- Only PDF documents are supported in the MVP.
- No OCR — scanned image-only PDFs will not extract text.
- English-language documents only for the MVP.

## Safety

This tool helps users organize information found in official documents. It does
not provide legal advice, and users should verify critical requirements with
the issuing institution. The agent never invents deadlines or required
documents — when information is missing, it is marked as such.

## Future Improvements

Google Calendar/Gmail integration, reminder notifications, multi-language
support, OCR for scanned documents, mobile app.
