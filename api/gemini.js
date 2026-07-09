// Vercel serverless function — proxies chat requests to Groq (OpenAI-compatible)
// using the server-side `Gemini_API` environment variable, so visitors never
// need to enter (or see) any key. (The env var is named Gemini_API but holds a
// Groq API key.) Files in /api are auto-detected by Vercel.

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const key = process.env.Gemini_API;
  if (!key) {
    res.status(200).json({ error: 'Server is missing the Gemini_API environment variable.' });
    return;
  }

  // Vercel usually parses JSON bodies, but guard for the string case.
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const {
    messages = [],
    system = '',
    maxTokens = 4096,
    model = 'llama-3.3-70b-versatile',
  } = body || {};

  // Convert the app's message format → OpenAI/Groq chat format (string content).
  const chat = [];
  if (system) chat.push({ role: 'system', content: system });
  for (const m of messages) {
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const cont = Array.isArray(m.content)
      ? m.content
      : [{ type: 'text', text: String(m.content || '') }];
    const text = cont.filter(c => c.type === 'text').map(c => c.text).join('\n');
    if (text) chat.push({ role, content: text });
  }

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + key },
      body: JSON.stringify({ model, messages: chat, max_tokens: maxTokens }),
    });
    const d = await r.json();
    if (d.error) {
      res.status(200).json({ error: (d.error && d.error.message) || 'Groq API error' });
      return;
    }
    const text = (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '';
    // Normalize usage to the shape the frontend already expects.
    const usage = d.usage
      ? { promptTokenCount: d.usage.prompt_tokens || 0, candidatesTokenCount: d.usage.completion_tokens || 0 }
      : null;
    res.status(200).json({ text: text || '(no response)', usage });
  } catch (e) {
    res.status(200).json({ error: 'Connection error: ' + e.message });
  }
};
