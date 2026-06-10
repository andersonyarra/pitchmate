require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function summarise(headline, url) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    tools: [{ type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 2 }],
    system: "You're briefing radio on-air talent. Read the article and return a tight summary: the who/what/when/where/why, then one line on the talk angle — is this news value or comedic value, and what's the hook. Max 4 sentences. No preamble.",
    messages: [{ role: 'user', content: `Headline: ${headline}\nURL: ${url}` }],
  });

  const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
  return text || null;
}

app.post('/summarise', async (req, res) => {
  const { pairs } = req.body;
  if (!Array.isArray(pairs) || pairs.length === 0) {
    return res.status(400).json({ error: 'No pairs provided' });
  }

  const results = await Promise.all(
    pairs.map(async ({ headline, url }) => {
      try {
        const summary = await summarise(headline, url);
        return { headline, url, summary };
      } catch (err) {
        console.error(`[summarise] ${headline} — ${err?.status ?? ''} ${err?.message ?? err}`);
        return { headline, url, summary: null, error: true, errorDetail: err?.message ?? String(err) };
      }
    })
  );

  res.json({ results });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`PitchMate running on http://localhost:${PORT}`));
