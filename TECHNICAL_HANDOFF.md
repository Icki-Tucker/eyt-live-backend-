# EYT Live Backend + Assessor Tool: Technical Handoff

For a developer picking up this project. Covers architecture, current state,
and what's still open.

## Architecture

Three pieces, each with a distinct job:

- **GitHub** (public repo: `github.com/Icki-Tucker/eyt-live-backend-`):
  source of truth for all code, and also hosts the static Assessor tool via
  GitHub Pages.
- **Render** (`https://eyt-live-backend.onrender.com`): runs `server.js`
  as an always-on Node/Express backend. Holds the Recall.ai API key and
  proxies bot-join requests, so the browser never talks to Recall.ai
  directly.
- **Recall.ai**: on request from the backend, sends a bot into a Google
  Meet call, runs transcription (Deepgram) on it, and posts transcript
  events back to the backend's webhook in real time.

Anthropic scoring calls are the one piece **not** routed through the
backend. The Assessor tool calls the Anthropic API directly from the
browser, using whatever API key the user has pasted into the Settings tab
for that session. See "Open items" below, this is a known gap.

## Repo contents

| File | Purpose |
|---|---|
| `server.js` | Backend. Express + `ws`. Routes: `/api/start-bot`, `/api/stop-bot`, `/api/webhook` (Recall.ai posts transcript events here), `/ws` (WebSocket relay to the frontend). |
| `EYT Live Language Assessment Tool v1.html` | The Assessor tool itself. Single-file app, see "Two copies" section below, this is the one non-obvious structural thing to know before editing it. |
| `EYT_Berlitz_Assessor_Operating_Guide.html` | End-user instructions, not developer-facing. |
| `README.md` | Original setup guide (Recall.ai signup, Render deploy steps). |
| `Dual_Scoring_Build_Brief.md` | Spec for the dual AI + interviewer scoring feature. Already implemented, kept for reference. |
| `CLAUDE.md` | Project context notes for AI-assisted development. |

## Live deployment

- Backend: `https://eyt-live-backend.onrender.com` (Render Starter/Free tier)
- Tool: `https://icki-tucker.github.io/eyt-live-backend-/EYT%20Live%20Language%20Assessment%20Tool%20v1.html`
- Repo is currently **public** (required for free GitHub Pages hosting)

### Environment variables (set in Render dashboard, not committed anywhere)

- `RECALL_API_KEY`
- `PUBLIC_BACKEND_URL` = `https://eyt-live-backend.onrender.com`
- `RECALL_REGION` = `ap-northeast-1` (this must match the region shown in
  the Recall.ai dashboard for whichever account owns the API key, it is
  not a free choice)

## Important: the HTML file has two copies of its own code

`EYT Live Language Assessment Tool v1.html` stores its logic twice:

1. The live, executing copy, roughly the first half of the file.
2. A second copy inside a hidden `<textarea id="_html_source">`, HTML-entity
   escaped. This feeds the tool's own "Download File with Keys Embedded"
   feature, which lets a user download a personal copy with their API key
   baked in.

**Any change to shared logic (Transcript Upload tab, PDF export, XLSX
export) needs to be made in both copies**, or the downloaded/shared version
will silently regress. The two copies had already drifted before recent
work started, the escaped mirror is currently missing the entire Live
Interview Mode feature. That gap was left as-is by choice (out of scope for
the work done so far), not accidentally.

## What's working

- Bot join flow: tool sends a Meet link to `/api/start-bot`, backend tells
  Recall.ai to join, bot appears in the call as "EYT Assessor."
- Live transcript relay: Recall.ai posts to `/api/webhook`, backend
  forwards over its own WebSocket to the tool, which renders it live.
- Automatic speaker tagging from the Meet participant name Recall.ai
  reports (first new name becomes Interviewer, everyone else becomes
  Candidate), with a manual "Swap" button as a correction if it guesses
  wrong. Confirmed with two real, distinct speakers on separate devices.
- Dual AI + interviewer scoring across both the Transcript Upload and Live
  Interview tabs, the PDF export (now landscape, two score columns), and
  the XLSX batch export.
- Pronunciation (PC) scoring in Live Interview Mode now uses real
  Deepgram word-confidence data (average confidence, specific flagged
  words with their exact percentages), not just transcript text. See
  "How PC confidence data actually works" below for how this is wired up.
- Confirmed in real test calls, both single-speaker and two-speaker.

## How PC confidence data actually works

Getting real confidence data into Phonological Control scoring took more
than just subscribing to another event. Two things Recall.ai's docs don't
document, found by inspecting real webhook payloads:

- `transcript.provider_data` (Deepgram's raw response, incl. per-word
  confidence) never includes a speaker name, unlike `transcript.data`.
- The obvious-looking IDs on the payload (`transcript.id`, `recording.id`,
  `bot.id`) are all shared across every speaker in the call, none of them
  identify who's talking.

The fix: Deepgram's own `metadata.request_id` stays stable for one
speaker's whole stream. `server.js` keeps a short buffer of recent
`transcript.data` utterances (speaker name + text + timestamp). The first
time a new `request_id` shows up on a `provider_data` event, it's matched
against that buffer by comparing text, then remembered for the rest of the
call, no repeated matching needed. If no match is found, that chunk of
confidence data is dropped rather than guessed at. The tool consumes the
result as a new `type: 'confidence'` WebSocket message, tagged the same
way the visible transcript already is.

## Open technical items

1. **Anthropic API key is client-side only.** Every user pastes their own
   key into Settings. This works, but is not a "just works" shared
   experience. Baking a shared key into the file was considered and
   rejected, since the tool is hosted at a public URL and the key would be
   readable by anyone via dev tools. The architecturally correct fix, if a
   keyless experience is wanted, is routing Anthropic calls through
   `server.js` the same way Recall.ai calls already work. Not built yet.

2. **GitHub Pages root URL serves the README, not the tool.** Fixed via an
   `index.html` redirect at the repo root. The direct tool URL is still
   long with `%20`-encoded spaces from the filename, worth a rename if an
   even cleaner shareable link matters.

3. **Repo is under a personal GitHub account**, so every URL carries
   `icki-tucker`. Moving to a GitHub Organization (free) or a custom domain
   was discussed as options, neither implemented.

4. **Recall.ai's API schema has already changed once** since this backend
   was first written, the bot-creation request moved from flat
   `transcription_options` / `real_time_transcription` fields to a nested
   `recording_config` object. Already fixed in the current `server.js`, but
   worth knowing Recall.ai's API is actively evolving, if `/api/start-bot`
   starts failing again, check their current docs before assuming the code
   is broken.

## Testing status

- Confirmed: bot join, single-speaker and two-speaker live transcription,
  speaker tagging accuracy across two real devices, periodic and final
  scoring calls firing correctly, real Deepgram confidence data reaching
  Phonological Control scoring.
- Not yet tested: full end-to-end PDF/XLSX export generated from an
  actual live interview.

## Cost model (for reference, not a commitment)

- Render Starter tier: $7/month flat, regardless of usage.
- Recall.ai: pay-as-you-go, $0.50 per bot-recording-hour after free trial
  credit runs out.
- Anthropic: pay-per-token on whatever model `server.js`/the tool is
  configured to call (currently `claude-sonnet-4-6`, $3 input / $15 output
  per million tokens). Rough estimate: about $0.09 per 15-minute live
  interview based on the current call pattern (periodic scoring every 90
  seconds, plus final scoring).
