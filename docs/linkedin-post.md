I just submitted Bureaucracy Action Agent to Google's All Things Agentic Hackathon (Taskmaster track) 🎯

Official documents (university letters, government notices, immigration paperwork) tell you what's required — but rarely make the *next steps* obvious: what to do, in what order, by when, and what happens if you delay.

So I built an agent that doesn't just summarize a document — it turns it into a live, persistent workflow:

📄 Upload any document (PDF, Word, PowerPoint, text, or a photo)
🤖 A real Google ADK agent extracts tasks, deadlines, and dependencies — and calls its own tools (validate_tasks, save_tasks) to build the plan
🎯 It picks a Next Best Action and explains *why*
🔁 When you complete a task, it re-walks the dependency graph, unblocks what's next, and updates its recommendation automatically — no re-upload, no manual refresh
📋 Every step is logged to a live Agent Activity feed, so the agent's reasoning is visible, not a black box

A few things I'm proud of under the hood:
• Priority and risk are computed deterministically in Python from deadline proximity and blocking relationships — never left to the LLM to "vibe"
• Conditional requirements ("only if your group has more than 4 members") get a real Yes/No confirmation instead of being guessed at
• Every AI-generated suggestion is visibly separated from what the source document actually states

Built with Gemini 3 Flash, Google ADK, FastAPI, Firestore, and Next.js — deployed end-to-end on Cloud Run.

Live demo + full write-up: [repo link]

#AllThingsAgenticHackathon #GoogleCloud #Gemini #BuildWithGoogleAI #AgentDevelopmentKit
