// Vercel serverless function — proxies chat requests to Google's Gemini API
// using the server-side `Gemini_API` environment variable, so visitors never
// need to enter (or see) any key. Files in /api are auto-detected by Vercel.

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
    model = 'gemini-2.0-flash',
  } = body || {};

  // Convert the app's message format → Gemini's `contents` format.
  const contents = [];
  for (const m of messages) {
    const role = m.role === 'assistant' ? 'model' : 'user';
    const cont = Array.isArray(m.content)
      ? m.content
      : [{ type: 'text', text: String(m.content || '') }];
    const parts = [];
    for (const c of cont) {
      if (c.type === 'text') {
        parts.push({ text: c.text });
      } else if (c.type === 'image' && c.source) {
        parts.push({ inline_data: { mime_type: c.source.media_type, data: c.source.data } });
      }
    }
    if (parts.length) contents.push({ role, parts });
  }

  const payload = { contents, generationConfig: { maxOutputTokens: maxTokens } };
  if (system) payload.systemInstruction = { parts: [{ text: system }] };

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (d.error) {
      res.status(200).json({ error: d.error.message || 'Gemini API error' });
      return;
    }
    const parts = (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || [];
    const text = parts.map(p => p.text || '').join('');
    res.status(200).json({ text: text || '(no response)', usage: d.usageMetadata || null });
  } catch (e) {
    res.status(200).json({ error: 'Connection error: ' + e.message });
  }
};
