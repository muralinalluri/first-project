Generate a professional follow-up email from the most recent meeting summary.

Look in the `outputs/` directory for the latest `summary-*.json` file.
If there is no summary file, ask the user to run the app first (`node server.js`, then open http://localhost:3000).

Once you have the summary, invoke the email skill by running:
```
node src/email-skill.js --summary <path-to-latest-summary.json> --tone $ARGUMENTS
```

If no tone is specified in $ARGUMENTS, default to `formal`.

Supported tones:
- `formal`   – professional business tone
- `friendly` – warm but professional
- `concise`  – brief, bullet-point style
- `detailed` – elaborate with context

After running the skill, report:
1. The email subject line
2. The plain text content of the email
3. The paths to the saved HTML and TXT files

If the user wants to customize the sender name, title, or recipients, prompt them before running the skill.
