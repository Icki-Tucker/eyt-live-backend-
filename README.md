# EYT Live Backend — Setup Guide

This is the missing piece that lets a Recall.ai bot join a Google Meet interview,
capture both speakers cleanly, and stream that live back into your Assessor tool.
No transcript upload, no manual speaker-switch button.

Give this whole folder plus this README to your coding agent (Claude Code or
similar) if you want help with any step. Everything below can also be done by
hand by following along.

---

## Step 1: Sign up for Recall.ai

1. Go to https://recall.ai and create an account.
2. Once logged in, find your API key in the dashboard (usually under
   Settings or API Keys). Copy it somewhere safe.
3. Recall.ai bills per bot-minute. Check their current pricing page before
   running real interviews, and note there's usually a free trial credit to
   test with first.

Note: Recall.ai's dashboard and exact API field names may have changed since
early 2026, which is the edge of what I can verify from here. If anything in
this backend's `/api/webhook` handler doesn't match what you're actually
receiving, check Recall.ai's current docs for their real-time transcription
webhook payload shape and adjust the field names in `server.js`.

## Step 2: Deploy the backend to Render

Render is a good starting point because it runs a real always-on server
(needed for the WebSocket connection), and has a free tier.

1. Go to https://render.com and sign up.
2. Push this `eyt-live-backend` folder to a new GitHub repo (ask your coding
   agent to help with this if you're not sure how — it's a few commands).
3. In Render, click **New > Web Service**, connect your GitHub repo.
4. Set:
   - **Build command**: `npm install`
   - **Start command**: `npm start`
5. Under **Environment Variables**, add:
   - `RECALL_API_KEY` → the key from Step 1
   - `PUBLIC_BACKEND_URL` → the URL Render gives your service once deployed
     (something like `https://eyt-live-backend.onrender.com`). You'll need to
     deploy once first to get this URL, then add it and redeploy.
   - `RECALL_REGION` → leave as default unless Recall.ai's dashboard shows you
     a different region for your account.
6. Deploy. Once live, visiting the URL in a browser should show
   "EYT Live Backend is running."

**Heads up on the free tier**: Render's free web services spin down after periods
of inactivity and take 30-60 seconds to wake back up on the next request. For a
live interview tool, that delay could happen right when the interviewer clicks
Start. If that's a problem in practice, Render's paid tier (around $7/month) keeps
the service always warm.

## Step 3: Update the Assessor HTML tool

This is the part your coding agent should apply directly to your actual HTML
file, since it needs to see the live file to place things correctly. Hand it
this spec:

**Remove:**
- The `getUserMedia` microphone capture logic inside `liveStart()`
- The Deepgram WebSocket connection code (`dgSocket`, the audio worklet, PCM
  encoding) — Recall.ai now runs Deepgram on its own end
- The `liveSwitchSpeaker()` function and its button in the Live Interview tab

**Add to the Live Interview tab HTML:**
- A text input for pasting the Google Meet link
- Keep the Start / Stop buttons, just wire them to the new flow below

**Add to the JavaScript, replacing the old `liveStart`:**

```javascript
const BACKEND_URL = 'https://YOUR-RENDER-URL.onrender.com'; // set this after deploying

let liveSocket = null;

async function liveStart() {
  const meetingUrl = document.getElementById('live-meet-link').value.trim();
  if (!meetingUrl) { alert('Paste the Google Meet link first.'); return; }

  liveSetStatus('Sending bot to join the call…', 'recording');

  const res = await fetch(BACKEND_URL + '/api/start-bot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ meetingUrl })
  });
  const data = await res.json();
  if (!res.ok) { liveSetStatus('Error: ' + data.error, 'idle'); return; }

  liveSocket = new WebSocket(BACKEND_URL.replace('https', 'wss') + '/ws');

  liveSocket.onmessage = (msg) => {
    const payload = JSON.parse(msg.data);
    if (payload.type === 'status') {
      liveSetStatus(payload.message, 'recording');
    }
    if (payload.type === 'transcript' && payload.isFinal) {
      // Map the speaker name Recall.ai gives you to Candidate/Interviewer.
      // Simplest approach: treat the first new speaker as Interviewer,
      // everyone else as Candidate — or prompt the assessor once at the
      // start to confirm which name is which.
      const speakerTag = resolveSpeakerTag(payload.speakerName);
      liveTranscriptSegs.push({ speaker: speakerTag, text: payload.text + ' ' });
      if (speakerTag === 'C') {
        liveSegmentBuffer += payload.text + ' ';
        liveCandidateWords = liveTranscriptSegs
          .filter(s => s.speaker === 'C')
          .reduce((n, s) => n + s.text.trim().split(/\s+/).filter(Boolean).length, 0);
        document.getElementById('live-word-count').textContent = liveCandidateWords + ' candidate words';
      }
      liveRenderTranscript();
    }
  };

  document.getElementById('live-start-btn').style.display = 'none';
  document.getElementById('live-stop-btn').style.display = 'inline-flex';
  liveIsRecording = true;

  liveScoreTimer = setInterval(() => {
    if (liveSegmentBuffer.trim().split(/\s+/).filter(Boolean).length >= LIVE_MIN_WORDS_TO_SCORE) liveRunSegmentScore();
  }, LIVE_SCORE_INTERVAL_MS);
}

// Simple first-pass speaker resolution. Refine this once you see what
// Recall.ai actually sends for speakerName in your webhook payloads.
let knownSpeakers = {};
function resolveSpeakerTag(name) {
  if (!knownSpeakers[name]) {
    knownSpeakers[name] = Object.keys(knownSpeakers).length === 0 ? 'I' : 'C';
  }
  return knownSpeakers[name];
}

async function liveStop() {
  liveIsRecording = false;
  clearInterval(liveScoreTimer);
  if (liveSocket) liveSocket.close();
  await fetch(BACKEND_URL + '/api/stop-bot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  liveRunFinalScore(); // whatever your existing final-scoring function is called
}
```

This keeps everything downstream (the 90-second scoring loop, the Anthropic
prompts, the results screen, the PDF/XLSX export) exactly as it already is.
Only the capture layer changes.

## Step 4: Test before a real interview

1. Start a test Google Meet with a second device or a colleague.
2. Paste the link into the tool and hit Start.
3. Confirm the bot joins (you'll see it appear as a participant named "EYT
   Assessor").
4. Talk on both ends and confirm text is showing up correctly labeled.
5. Check the `resolveSpeakerTag` mapping actually lines up the right person
   as Candidate. Adjust the logic if it guesses wrong, for example by asking
   the interviewer to confirm which name is the candidate right after the bot
   joins.

## A note on consent

A bot visibly joining the call counts as recording someone's voice. Depending
on where your candidates are located, this may require you to disclose it and
get consent, sometimes explicitly before the call starts. Worth checking with
whoever handles compliance at Aven before rolling this out widely.
