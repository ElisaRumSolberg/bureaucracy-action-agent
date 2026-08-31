# Bureaucracy Action Agent — Devpost Story

Copy-paste ready for the Devpost "Story" fields.

## Inspiration

Official documents often contain important deadlines, required actions, and complicated instructions, but they are rarely written in a way that makes the next step obvious.

The idea for Bureaucracy Action Agent came from a simple problem: understanding a document is not always enough. People still need to know what to do, when to do it, and what should happen first.

Most AI tools stop at summarization. We wanted to go one step further and turn complex documents into structured, actionable workflows.

## What it does

Bureaucracy Action Agent analyzes official documents and converts them into a clear, ordered action plan.

Instead of only summarizing a document, the agent can:

- identify required actions
- detect deadlines
- extract required documents
- assign priorities
- identify dependencies between tasks
- rank what to do first with a **deterministic Next Best Action engine** — priority, blocking impact, and deadline proximity decide the order, not the model's own opinion
- surface risk at a glance with a **Risk Radar**: approaching deadlines, blocked tasks, unanswered conditions, missing information
- group multiple related documents into a shared **Case**, with one combined task list, one shared next best action, and automatic detection when two documents in the same case land on the same deadline
- save structured tasks and track their state over time
- present the result as a clear, trackable workflow

For example, if a document says that a user must submit identification before completing an application, the agent recognizes that dependency and creates the tasks in the correct order. If a second, related document shares a deadline with the first, the Case view flags it automatically — no manual cross-checking required.

## How we built it

The project is designed around an agentic workflow rather than a simple chatbot.

The core architecture uses:

- **Gemini 3.5 Flash** (via Vertex AI) for document understanding and structured extraction
- **Google ADK** for agent orchestration and tool-based actions
- **Firestore** for storing documents, tasks, cases, and activity events
- **Google Cloud Run** for deploying both the FastAPI backend and the Next.js frontend
- a web interface for uploading documents, tracking tasks, and viewing action plans

The workflow is:

```
Document
   ↓
Extract information
   ↓
Identify actions and deadlines
   ↓
Detect dependencies
   ↓
Validate tasks (deterministic, non-LLM)
   ↓
Rank the Next Best Action (deterministic, non-LLM)
   ↓
Save tasks to Firestore
   ↓
Display the action plan
```

The agent uses structured outputs so that deadlines, tasks, dependencies, and confidence values can be processed reliably instead of being returned only as free-form text. Critically, the model's job stops at interpretation — priority ranking, dependency resolution, and next-action selection are all plain deterministic logic, kept in sync between backend and frontend so every recommendation is explainable and testable rather than a black box.

## Challenges we ran into

One of the main challenges was preventing the AI from inventing information that was not present in the document. For example, if a document does not contain an exact deadline, the system should not create one. We designed the workflow to preserve uncertainty and return missing values instead of guessing.

Another challenge was distinguishing between simple document summarization and true agentic behavior. To solve this, the system does not stop after generating text. It validates extracted actions, creates structured tasks, and persists them in Firestore.

Dependency detection was another important challenge. Official instructions often describe tasks indirectly, such as requiring one document to be submitted before another action can happen. Representing these relationships clearly became an important part of the project.

A separate challenge appeared once documents could belong to a shared Case: keeping cross-document aggregation (risk stats, next best action, deadline conflicts) always in sync with each document's own state, and making sure Firestore writes for a task list replacement were atomic — a batch, not a loop of independent writes — so a mid-write failure could never leave a document half-updated.

## Accomplishments that we're proud of

We're especially proud that we moved beyond building another document summarizer and designed an agentic workflow that turns information into action.

Some of the accomplishments we're most proud of include:

- Designing a clear end-to-end workflow from document upload to structured, actionable tasks.
- Extracting not only actions, but also deadlines, priorities, required documents, and dependencies between tasks.
- Building a **deterministic Next Best Action engine** and **Risk Radar** so the system always tells you what to do first and what needs attention — decided by rules, not model opinion.
- Building a **Cases** feature that groups multiple related documents into one shared workflow, automatically detecting when two documents share the same deadline — going beyond single-document analysis.
- Using structured outputs to make the system more reliable and reduce hallucinated information.
- Making the agent preserve uncertainty instead of inventing missing deadlines or requirements.
- Connecting the AI workflow to Firestore, allowing the agent to persist the action plan rather than simply return a text response.
- Backing the system with a **140+ test suite** covering the dependency graph, conditional tasks, authorization boundaries, concurrent updates, malformed model output, and Firestore write atomicity.
- Building the project around Gemini, Google ADK, and Google Cloud, giving the agent tools and persistent state instead of treating the model as a standalone chatbot.
- Keeping the product focused on a real-world problem and designing an experience that can be understood in just a few seconds.

Most importantly, we're proud of the core idea behind the project: AI should not only help users understand complex information — it should help them know what to do next.

## What we learned

This project taught us that building a useful AI agent is not only about choosing a powerful model.

Reliable agentic systems also require:

- clear tool boundaries
- structured outputs
- validation
- persistent state
- uncertainty handling
- strong workflow design
- atomic writes wherever state can be partially updated

We also learned that a smaller, focused workflow can be more useful than a large assistant that tries to do everything.

## What's next for Bureaucracy Action Agent

Future versions could include:

- Google Calendar integration
- reminder notifications
- email integration
- institution-specific workflows
- automatic preparation of forms
- human review for high-impact actions
- cross-document dependency inference within a Case (today, each document's dependency graph stays independent by design)

Our long-term goal is to make complex administrative processes easier to understand and easier to complete.

We don't just summarize bureaucracy. We turn it into executable actions.
