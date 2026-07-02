// ══════════════════════════════════════════════════════
// EYT Berlitz Assessor — Live Interview Backend
// Connects the assessor tool to Recall.ai so a bot can join
// the Google Meet call and stream speaker-labeled transcript
// data back to the frontend in real time.
// ══════════════════════════════════════════════════════

const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');

const app = express();
app.use(cors());
app.use(express.json());

const RECALL_API_KEY = process.env.RECALL_API_KEY;
const RECALL_REGION = process.env.RECALL_REGION || 'us-east-1'; // Recall.ai has region-specific base URLs
const PUBLIC_BACKEND_URL = process.env.PUBLIC_BACKEND_URL; // e.g. https://your-app.onrender.com

if (!RECALL_API_KEY) {
  console.warn('WARNING: RECALL_API_KEY is not set. Set it in your environment variables before deploying.');
}
if (!PUBLIC_BACKEND_URL) {
  console.warn('WARNING: PUBLIC_BACKEND_URL is not set. Recall.ai needs this to send webhook data back to you.');
}

// In-memory state. This tool runs one interview at a time, so we don't need a database.
let activeBotId = null;
let connectedClients = []; // frontend WebSocket connections listening for live updates

// ── Start a bot for a given Meet link ──
app.post('/api/start-bot', async (req, res) => {
  const { meetingUrl } = req.body;
  if (!meetingUrl) return res.status(400).json({ error: 'meetingUrl is required' });
  if (!RECALL_API_KEY) return res.status(500).json({ error: 'Server is missing RECALL_API_KEY' });

  try {
    const response = await fetch(`https://${RECALL_REGION}.recall.ai/api/v1/bot/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${RECALL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        meeting_url: meetingUrl,
        bot_name: 'EYT Assessor',
        transcription_options: {
          provider: 'deepgram' // Recall.ai runs Deepgram on its side, with diarization
        },
        real_time_transcription: {
          destination_url: `${PUBLIC_BACKEND_URL}/api/webhook`
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Recall.ai error:', data);
      return res.status(response.status).json({ error: data.detail || 'Recall.ai rejected the request' });
    }

    activeBotId = data.id;
    broadcastToClients({ type: 'status', message: 'Bot is joining the call…' });
    res.json({ botId: data.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to start bot: ' + err.message });
  }
});

// ── Stop the active bot ──
app.post('/api/stop-bot', async (req, res) => {
  const { botId } = req.body;
  const idToStop = botId || activeBotId;
  if (!idToStop) return res.json({ ok: true, message: 'No active bot' });

  try {
    await fetch(`https://${RECALL_REGION}.recall.ai/api/v1/bot/${idToStop}/leave_call/`, {
      method: 'POST',
      headers: { 'Authorization': `Token ${RECALL_API_KEY}` }
    });
    activeBotId = null;
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to stop bot: ' + err.message });
  }
});

// ── Recall.ai sends transcript events here in real time ──
app.post('/api/webhook', (req, res) => {
  const event = req.body;

  // Recall.ai's real-time transcript payload includes the speaker and text.
  // Exact field names can shift between API versions, so double check against
  // current Recall.ai docs when wiring this up and adjust the mapping below.
  const speakerName = event?.data?.data?.participant?.name || event?.speaker || 'Unknown';
  const words = event?.data?.data?.words || [];
  const text = words.map(w => w.text).join(' ') || event?.transcript || '';
  const isFinal = event?.data?.data?.is_final ?? true;

  // Best-effort: forward per-word confidence if Recall.ai's payload includes it (used for
  // pronunciation/clarity scoring downstream). Field name may need adjusting once you see
  // a real webhook payload — check current Recall.ai docs if this comes through empty.
  const wordConfidences = words
    .filter(w => typeof w.confidence === 'number')
    .map(w => ({ word: w.text, confidence: w.confidence }));

  if (text && text.trim()) {
    broadcastToClients({
      type: 'transcript',
      speakerName,
      text,
      isFinal,
      words: wordConfidences
    });
  }

  res.sendStatus(200);
});

// ── Simple health check ──
app.get('/', (req, res) => res.send('EYT Live Backend is running.'));

// ── WebSocket: pushes live transcript data to the frontend ──
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  connectedClients.push(ws);
  ws.send(JSON.stringify({ type: 'status', message: 'Connected to backend.' }));
  ws.on('close', () => {
    connectedClients = connectedClients.filter(c => c !== ws);
  });
});

function broadcastToClients(payload) {
  const msg = JSON.stringify(payload);
  connectedClients.forEach(ws => {
    if (ws.readyState === ws.OPEN) ws.send(msg);
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`EYT Live Backend running on port ${PORT}`));
