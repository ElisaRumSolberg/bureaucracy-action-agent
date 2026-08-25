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
3. A real `google.adk.agents.LlmAgent` (not a bare Gemini call) reasons over
   the document text and extracts tasks, deadlines, and required documents
   as part of its own turn.
4. The agent calls its `validate_tasks` tool with what it extracted — this
   is an actual ADK function-tool call, visible in Cloud Run logs, that
   dedupes tasks, normalizes dates, and sanity-checks priority/dependencies.
5. The agent then calls its `save_tasks` tool (no arguments — it reads the
   already-validated tasks from the pipeline, so the model never has to
   re-transcribe them) to persist everything to Firestore.
6. Only once both tool calls have succeeded does the agent produce its final
   response: a short plain-text document summary.
7. The UI displays the resulting action plan as a task dashboard.

## Agent Tools

Defined in `backend/app/agent/adk_agent.py`, registered on the `LlmAgent`
via `google.adk.tools.FunctionTool`:

- `validate_tasks(tasks, warnings, missing_information)` — dedupe, normalize
  dates, flag missing information, sanity-check priority/dependencies.
- `save_tasks()` — persist the already-validated tasks to Firestore. Takes
  no LLM-supplied arguments by design: the validated task list is held in a
  small pipeline object the tools close over, so there's no risk of the
  model corrupting data by having to copy a large JSON blob between two
  tool calls.

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
