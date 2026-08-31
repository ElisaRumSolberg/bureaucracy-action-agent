# Devpost submission text — Bureaucracy Action Agent

Copy-paste ready. Track: **The Taskmaster**.

---

## Elevator pitch (short tagline field, if present)

Upload any official document — a university letter, a residence permit
notice, an insurance renewal — and get back an ordered, trackable action
plan: what to do first, what's blocked on what, and what's at risk.

---

## Text description

### The problem

Every official document hides the same three questions: what do I need to
do, by when, and in what order. People lose track of deadlines, miss a
prerequisite step, or don't realize two documents are asking for
conflicting things — not because they're careless, but because bureaucracy
is genuinely hard to parse and nothing tracks it for them across documents
and over time.

### What it does

Bureaucracy Action Agent reads any official document (PDF, Word,
PowerPoint, plain text, or a photo) and turns it into a structured,
trackable action plan:

- Extracts every task, deadline, dependency, required document, and
  conditional requirement from the raw text.
- Ranks what to do first with a **deterministic engine** — priority,
  blocking impact, and deadline proximity decide the order, never the
  model's own opinion of what matters.
- Surfaces risk before it becomes a problem: approaching deadlines,
  blocked tasks, unanswered conditions, missing information — all in one
  Risk Radar view.
- Groups related documents (e.g. every document in one visa application)
  into a **Case**, with one shared task list and one shared next best
  action, and automatically flags when two documents in the same case
  share a deadline.
- Answers "what if I delay this?" by walking the dependency graph to show
  exactly which downstream tasks would be affected.
- Explains itself: every recommendation traces back to why — priority,
  what it blocks, and the exact source sentence in the original document.

It's explicitly not a document summarizer. A summary tells you what a
document says; this tells you what to actually do about it, in what order,
and why.

### Features and functionality

- Multi-format upload (PDF, DOCX, PPTX, plain text, image/photo of a
  document) with OCR support for scanned documents.
- Deterministic Next Best Action engine (priority → blocking impact →
  deadline), kept in sync between backend and frontend and covered by
  dedicated unit tests.
- Risk Radar: approaching deadlines, blocked tasks, unanswered
  conditions, missing information, at a glance.
- Dependency graph: a Critical Path view (the longest chain of dependent
  tasks) and an All Tasks view grouped by dependency depth.
- Conditional tasks: the agent asks "does this apply to you?" for
  conditional requirements and excludes ones marked "no" from the plan
  and from blocking calculations — and frames an unresolved conditional
  recommendation as a clarification to answer, not an instruction to
  execute.
- Cases: group multiple documents belonging to one real-world process
  into a single shared plan, with automatic same-day deadline-collision
  detection across documents.
- Per-task AI panels: "How to complete this" guidance, free-form Q&A
  about a specific task, and delay-impact analysis — each grounded in the
  document's own text plus the task graph, not a generic chat.
- Full agent activity log: every extraction, validation, and
  recommendation-change event, timestamped, so the agent's reasoning is
  auditable, not a black box.
- In-place translation: re-explain the whole plan in another language
  without losing task state or progress.
- Firebase Google Sign-In (optional) with anonymous guest fallback —
  documents are scoped per user either way.
- Atomic Firestore writes: task-list replacement and document deletion
  each go through a single batch, so a mid-write failure can't leave a
  document in a half-updated state.

### Technologies used

- **Gemini 3.5 Flash** via Vertex AI (`global` location) — document
  extraction, task-completion guidance, task Q&A, delay-impact narration,
  and translation.
- **Google ADK** (`LlmAgent` + `FunctionTool`) — real agent orchestration
  around the extraction/validation/save pipeline, not a bare model call.
- **Cloud Run** — both the FastAPI backend and the Next.js frontend are
  deployed here.
- **Firestore** — documents, tasks, per-document event log, and cases.
- **Firebase Authentication** — optional Google Sign-In, verified
  server-side; ownership checks gate every document/task/case route.
- **Next.js 16 + TypeScript + Tailwind** — frontend.
- **FastAPI + Pydantic + pytest** — backend, with a 141-test suite
  covering the dependency graph, next-best-action logic, conditional
  tasks, case isolation, authorization, concurrency, idempotent
  completion, malformed-Gemini-output handling, and Firestore
  partial-failure/atomicity behavior.

### Other data sources used

None — the only input is the document the user uploads. No external
datasets, no third-party APIs beyond Google Cloud/Gemini.

### Findings and learnings

- **Separating interpretation from decision-making mattered more than
  expected.** Letting Gemini extract and describe tasks, but keeping
  priority ranking, dependency resolution, and next-best-action selection
  in plain deterministic Python (mirrored in TypeScript for the frontend)
  made the whole system explainable and testable in a way a pure
  LLM-decides-everything approach never could have been — every
  recommendation has a traceable, non-probabilistic reason.
- **The hardest bugs weren't in the AI, they were in the state machine.**
  Conditional tasks that get resolved (unblocking one thing) while their
  own downstream effects need recomputing, case-level aggregation staying
  consistent with per-document views, and Firestore writes that needed to
  be atomic rather than a loop of independent operations — these took far
  more care than the Gemini prompting did.
- **Scope discipline paid off.** Cross-document dependency inference
  (e.g. "finish the bank letter before this becomes actionable") was
  deliberately left out of Cases in favor of a simpler, fully-tested
  shared-task-list-and-shared-next-action model — a smaller feature that
  actually works beats a bigger one that's half-verified.
- **A hackathon deadline is a good forcing function for an adversarial
  test pass.** Explicitly testing authorization boundaries, concurrent
  updates, idempotent completion, and malformed model output surfaced
  three real bugs (a missing ownership check on six routes, a downstream-
  impact false positive for excluded conditional tasks, and the Firestore
  atomicity gap above) that would have shipped otherwise.

---

## Spin-up instructions

Already in `README.md` under **Local Setup** and **Cloud Deployment** —
both sections give copy-pasteable commands for running the backend/frontend
locally and for redeploying to Cloud Run.

## Live demo

- Frontend: https://bureaucracy-agent-web-760863161403.us-central1.run.app
- Backend: https://bureaucracy-agent-api-760863161403.us-central1.run.app
- Repo: https://github.com/ElisaRumSolberg/bureaucracy-action-agent
