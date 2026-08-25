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
python -m venv .venv
.venv/Scripts/activate   # Windows
pip install -r requirements.txt
gcloud auth application-default login   # Gemini/Firestore auth (ADC, no API key needed)
cp .env.example .env                    # fill in GOOGLE_CLOUD_PROJECT
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # points at the backend, defaults to localhost:8000
npm run dev
```

## Cloud Deployment

Live demo:

- Frontend: https://bureaucracy-agent-web-760863161403.us-central1.run.app
- Backend: https://bureaucracy-agent-api-760863161403.us-central1.run.app

Both run on Cloud Run in project `bureaucracy-action-agent`, using a
dedicated service account (`bureaucracy-agent-run`) with `roles/datastore.user`
and `roles/aiplatform.user` — no API keys, auth is Application Default
Credentials end to end.

### Backend

```bash
cd backend
gcloud run deploy bureaucracy-agent-api \
  --source . \
  --region=us-central1 \
  --service-account=bureaucracy-agent-run@bureaucracy-action-agent.iam.gserviceaccount.com \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=bureaucracy-action-agent,GOOGLE_CLOUD_LOCATION=us-central1,FIRESTORE_DATABASE=(default),GEMINI_MODEL=gemini-2.5-flash" \
  --allow-unauthenticated
```

### Frontend

`NEXT_PUBLIC_API_URL` is inlined into the JS bundle at build time, so the
image has to be built with the backend's URL baked in — a plain
`gcloud run deploy --source` can't pass a Docker build-arg, so build via
Cloud Build first, then deploy the built image:

```bash
cd frontend
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions="_IMAGE=us-central1-docker.pkg.dev/bureaucracy-action-agent/cloud-run-source-deploy/bureaucracy-agent-web:latest,_API_URL=https://bureaucracy-agent-api-760863161403.us-central1.run.app"

gcloud run deploy bureaucracy-agent-web \
  --image=us-central1-docker.pkg.dev/bureaucracy-action-agent/cloud-run-source-deploy/bureaucracy-agent-web:latest \
  --region=us-central1 \
  --allow-unauthenticated
```

After the frontend's URL is known, update the backend's CORS allowlist:

```bash
gcloud run services update bureaucracy-agent-api \
  --region=us-central1 \
  --update-env-vars="ALLOWED_ORIGINS=https://bureaucracy-agent-web-760863161403.us-central1.run.app"
```

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
