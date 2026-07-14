# EYT Live Backend — Project Context

## What this project is

A backend service that connects the EYT Berlitz Assessor tool (a single-file
HTML app that scores language interviews) to Recall.ai, so a bot can join a
Google Meet interview and capture both speakers cleanly and separately. This
feeds live, speaker-labeled transcript data into the Assessor's existing
scoring pipeline, removing the need for manual transcript upload or manual
speaker-tagging during a live interview.

This is NOT a rebuild of the Assessor tool. Its scoring engine, PDF/XLSX
export, and existing tabs stay as they are except where a specific task below
says otherwise.

## Active tasks

1. **Recall.ai backend integration** — full spec in README.md in this folder.
   Connects the bot join flow, webhook receiver, and WebSocket push to the
   Assessor's Live Interview tab.
2. **Dual AI + interviewer scoring** — full spec in
   Dual_Scoring_Build_Brief.md in this folder. Adds an interviewer score
   alongside the AI score for all four CEFR dimensions, plus a landscape PDF
   layout to fit both.

Read the relevant file fully before starting either task. Don't reproduce
their full contents here, just treat this as the index.

## Preferences

- I (Tucker) vibe code and don't write code manually. Explain plainly,
  work in checkpoints, and wait for confirmation before moving to the next
  phase of a task rather than running straight through.
- No em dashes anywhere, including in code comments or commit messages.
- Be cost-conscious: avoid re-reading whole files unnecessarily, batch edits,
  and don't over-narrate progress after every small step.