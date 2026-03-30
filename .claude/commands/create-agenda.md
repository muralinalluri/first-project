Generate a meeting agenda for the next meeting based on the latest meeting summary.

Look in the `outputs/` directory for the latest `summary-*.json` file.
If there is no summary file, tell the user to run the app first (`node server.js`, then open http://localhost:3000) and complete at least the Summarize step.

Read the summary JSON and extract:
- `nextSteps` — these become agenda items
- `actionItems` — include as a standing agenda section for status updates
- `title` — use to infer the recurring meeting name
- `attendees` — suggest as invitees

Then generate a structured agenda in this format:

---
# Agenda: [Meeting Title] — Follow-up
**Date:** [Leave blank for user to fill]
**Time:** [Leave blank for user to fill]
**Attendees:** [From previous summary]

## 1. Action Item Status Updates (10 min)
Review progress on action items from the last meeting:
- [List each action item with owner]

## 2. [Next Step 1] (X min)
## 3. [Next Step 2] (X min)
...

## [Last Item]. Open Discussion & New Business (5 min)

## [Last Item + 1]. Next Steps & Wrap-up (5 min)
---

Assign estimated time to each agenda item based on its complexity.
Save the agenda as `outputs/agenda-<timestamp>.md` using the Write tool.
Report the saved file path and display the full agenda.
