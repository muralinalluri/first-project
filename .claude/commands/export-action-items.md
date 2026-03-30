Export action items from the latest meeting summary as a formatted checklist.

Look in the `outputs/` directory for the latest `summary-*.json` file.
If there is no summary file, tell the user to run the app first (`node server.js`, then open http://localhost:3000) and complete at least the Summarize step.

Read the summary JSON and extract the `actionItems` array.
Each action item has: `task`, `owner`, `deadline`.

Format the checklist in two formats:

### 1. Markdown Checklist (for docs/notion/github)
```
# Action Items — [Meeting Title]
Date: [summary date]

- [ ] [Task] — Owner: [Owner] | Due: [Deadline]
- [ ] [Task] — Owner: [Owner] | Due: [Deadline]
...
```

### 2. Slack-ready format (plain text, easy to paste)
```
*Action Items from [Meeting Title]*
□ [Task] (@Owner) — Due: [Deadline]
□ [Task] (@Owner) — Due: [Deadline]
...
```

If $ARGUMENTS is "slack", show only the Slack format.
If $ARGUMENTS is "markdown", show only the Markdown format.
If no argument is given, show both formats.

Save the markdown checklist as `outputs/action-items-<timestamp>.md` using the Write tool.
Report the number of action items found, the saved file path, and display both formats.
