# Session Summary: Backend Deployment, Dual Scoring, and Public Hosting

Covers everything built and decided across this conversation, so a fresh
session (or a teammate) can pick up context without re-reading the whole
thread. Written early July 2026.

## 1. Backend deployed and wired to Recall.ai

- Pushed the `eyt-live-backend` folder to a new GitHub repo:
  `github.com/Icki-Tucker/eyt-live-backend-` (now public, see section 4).
- Deployed `server.js` to Render as an always-on web service:
  `https://eyt-live-backend.onrender.com`
- Environment variables set on Render: `RECALL_API_KEY`, `PUBLIC_BACKEND_URL`,
  `RECALL_REGION` (set to `ap-northeast-1`, confirmed from the Recall.ai
  dashboard, since the account is in Asia).
- Fixed a real bug along the way: Recall.ai changed their bot-creation API
  schema since the original README was written. The old flat
  `transcription_options` / `real_time_transcription` fields are gone,
  replaced with a nested `recording_config` object
  (`transcript.provider.deepgram_streaming` + `realtime_endpoints`). This is
  fixed in the current `server.js`.
- Confirmed working: a real Recall.ai bot joined a real Google Meet call and
  transcribed the candidate's voice. Not yet tested with two speakers in the
  same call (Tucker was alone during the test).

## 2. Assessor tool: rewired from browser mic to Recall.ai

The Live Interview Mode tab used to capture audio directly from the browser's
microphone and stream it straight to Deepgram. That is now removed entirely.
Instead:

- The tool sends a Google Meet link to the backend's `/api/start-bot`.
- The backend tells Recall.ai to send a bot into the call.
- Live transcript data streams back over the backend's own WebSocket
  (`/ws`), not a direct Deepgram connection.
- Speaker tagging (candidate vs. interviewer) is now automatic, based on the
  Meet participant name Recall.ai reports (first new name seen becomes
  Interviewer, everyone else becomes Candidate). A "Swap" button lets the
  interviewer correct it if it guesses backward. This replaced the old
  manual toggle button.
- Known gap: Recall.ai's standard transcript event does not include
  per-word confidence data, which the Pronunciation (PC) scoring prompt was
  built to use. The backend passes confidence through if it is ever present,
  but in practice it currently comes through empty, so PC scoring falls back
  to text-only evidence for live interviews until this is revisited (would
  need a different Recall.ai event subscription with a different payload
  shape).

## 3. Dual AI + interviewer scoring (finished)

Every dimension (Linguistic Range, Grammatical Accuracy, Fluency,
Phonological Control) now shows both an AI score and an interviewer score,
in both the Transcript Upload tab and Live Interview Mode, in the PDF export,
and in the XLSX batch export. Full spec was in `Dual_Scoring_Build_Brief.md`.

Key decision made along the way: when AI and interviewer scores disagree,
the interviewer's score wins for the qualifying level and suitability
write-up once entered; the AI score is only the fallback if the interviewer
has not scored that dimension yet.

One structural finding worth remembering: the tool keeps two copies of its
own code in one file, the live version and a hidden escaped copy used by the
"Download File with Keys Embedded" feature. Those two copies had already
drifted apart before this work started (the escaped copy is missing the
entire Live Interview Mode feature). That gap was left as-is by choice, not
fixed, since backfilling it was out of scope.

## 4. Tool is now publicly hosted

- The repo was made **public** (was private) so GitHub Pages could serve it
  for free.
- Live tool: `https://icki-tucker.github.io/eyt-live-backend-/EYT%20Live%20Language%20Assessment%20Tool%20v1.html`
- Operating guide: `https://icki-tucker.github.io/eyt-live-backend-/EYT_Berlitz_Assessor_Operating_Guide.html`
- The root URL currently shows the README (GitHub's default behavior when
  there is no `index.html`), not the tool. Nothing broken, just not fixed
  yet, still an open item if a clean shared link is wanted.
- Open question, paused for later: whether to move the repo to a GitHub
  Organization so the URL does not carry Tucker's personal username. Two
  paths discussed: a company-branded custom domain, or a free GitHub Org
  (e.g. `extend-your-team`). Not decided yet.

## 5. API key handling, still an open decision

Right now, every person who opens the shared tool pastes their own Anthropic
API key into Settings (session only, not saved anywhere). The tool also has
a built in "Embed Key in File" feature that bakes a key directly into a
downloaded copy of the file.

**Do not use that embed feature on the publicly hosted copy.** Since the
repo and the Pages site are public, an embedded key would be readable by
anyone who opens dev tools or looks at the GitHub source, not just the team.
This was flagged but not yet resolved. Three options were on the table when
the conversation paused:

1. Keep it as is, everyone pastes their own key (safest, some friction).
2. Route Anthropic scoring calls through the Render backend instead of
   calling Anthropic directly from the browser, the same way Recall.ai
   calls already work. Removes the need for anyone to have a key at all, but
   is a real rebuild of how scoring calls are made, not done.
3. Embed it anyway and accept that it is effectively a public key at that
   point. Not recommended given the public hosting.

## 6. Cost estimate (rough, for planning only)

For 100 fifteen-minute Live Interviews in a month, with the lowest paid
tiers:

- Render Starter tier: flat $7.00/month regardless of usage.
- Recall.ai pay-as-you-go: 25 hours of bot time x $0.50/hour = $12.50.
- Anthropic (`claude-sonnet-4-6`, $3/$15 per million input/output tokens):
  roughly $0.09 per interview x 100 = about $9.00.
- **Total: roughly $28 to $29/month** for 100 interviews, all-in.

This does not include Anthropic usage from the Transcript Upload tab, which
was not estimated.

## 7. A couple of things worth remembering about how this session went

- The project's own `CLAUDE.md` says no em dashes anywhere, including in
  written communication. That was missed for most of this conversation and
  should be followed going forward.
- Tucker vibe codes and does not write code by hand. Explanations should
  stay plain, work should happen in checkpoints with confirmation between
  phases rather than running straight through, and progress narration
  should stay light.
