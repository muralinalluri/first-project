Analyze all meeting summaries in the `outputs/` directory and generate a stats report.

Look for all `summary-*.json` files in the `outputs/` directory.
If no summary files are found, tell the user to run the app first (`node server.js`, then open http://localhost:3000) and complete at least one meeting summary.

Read every summary JSON file and analyze:

1. **Overview Stats**
   - Total number of meetings
   - Date range (earliest to latest)
   - Average number of attendees per meeting
   - Total action items across all meetings

2. **Top Attendees**
   - List attendees who appear most frequently across meetings

3. **Action Item Insights**
   - Total action items generated
   - How many have a specific deadline vs "Not specified"
   - Most common action item owners (who gets assigned the most tasks)

4. **Meeting Sentiment Trend**
   - Count of positive / neutral / negative meetings
   - Note any trend if meetings are getting more positive or negative

5. **Recurring Themes**
   - Look across all `keyPoints` and `nextSteps` for common words or topics
   - List top 5 recurring themes or topics

6. **Follow-up Rate**
   - How many meetings had `followUpRequired: true`

Format the report clearly with sections and emoji indicators for readability.
Save it as `outputs/meeting-stats-<timestamp>.md` using the Write tool.
Display the full report and report the saved file path.
