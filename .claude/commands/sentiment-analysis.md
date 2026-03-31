Run a deep sentiment analysis on the most recent meeting summary.

Look in the `outputs/` directory for the latest `summary-*.json` file.
If there is no summary file, ask the user to run the app first (`node server.js`, then open http://localhost:3000).

Once you have the summary, run:
```
node src/sentiment-skill.js --summary <path-to-latest-summary.json>
```

The analysis will produce:
1. Overall sentiment (positive / neutral / negative) with a score from -1.0 to 1.0
2. Sentiment breakdown (% positive, neutral, negative)
3. Key positive signals and concerns
4. Per-topic sentiment
5. Team dynamics assessment
6. Actionable recommendations

After running, report the full analysis in a clear, structured format.
