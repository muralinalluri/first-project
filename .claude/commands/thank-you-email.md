Generate a professional thank-you email from the most recent meeting summary.

Look in the `outputs/` directory for the latest `summary-*.json` file.
If there is no summary file, ask the user to run the app first (`node server.js`, then open http://localhost:3000).

Once you have the summary, run:
```
node src/email-skill.js --summary <path-to-latest-summary.json> --tone $ARGUMENTS --type thank-you
```

If no tone is specified in $ARGUMENTS, default to `formal`.

Supported tones:
- `formal`   – professional and respectful
- `friendly` – warm and appreciative
- `concise`  – brief and sincere
- `detailed` – elaborate with personal acknowledgements

The thank-you email should:
1. Open with sincere thanks for attendees' time and participation
2. Highlight what was accomplished in the meeting
3. Acknowledge contributions where attendees are listed
4. Express enthusiasm about the outcomes and next steps
5. Close warmly and professionally

After running the skill, report:
1. The email subject line
2. The plain text content of the email
3. The paths to the saved HTML and TXT files
