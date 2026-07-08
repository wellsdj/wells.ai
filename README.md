# Wells.AI

A sleek, self-contained single-file AI chat interface that connects directly to Anthropic's Claude API from your browser. No server, no install, no build step — just open the HTML file and go.

---

## What It Is

`wells-ai.html` is a feature-rich chat UI built entirely in vanilla HTML, CSS, and JavaScript. It communicates with the Anthropic API directly from the browser using your API key, which is never saved or stored anywhere.

---

## Features

### Core Chat
- **Multi-conversation sidebar** — create, rename, and delete chats, all persisted in `localStorage`
- **Streaming responses** — tokens stream in live as Claude generates them
- **Markdown rendering** — responses render with full markdown: headers, code blocks, tables, blockquotes, etc.

### Model Selection
Choose between three Claude models per conversation:
- **Claude Haiku 4.5** — fast and economical (default)
- **Claude Sonnet 4.6** — balanced speed and intelligence
- **Claude Opus 4.6** — frontier model with 1M context

### Feature Toggles
- **Chain of Thought** — enables extended thinking mode for deeper reasoning
- **Web Search** — integrates Brave Search API for real-time web results (requires a Brave API key set in Settings)

### Slash Commands
Type `/` in the input to access quick commands including persona modes, fun features like a "roast" mode, and more.

### Split View
Run two Claude models side-by-side simultaneously and compare their responses to the same prompt in real time.

### Canvas Panel
Code blocks in responses can be opened in a Canvas panel with three views:
- **Preview** — renders HTML/JS live in an iframe
- **Code** — raw source view
- **Markdown** — formatted markdown view

### Token Usage & Cost Tracking
- Live token meter showing input/output usage per conversation
- Running cost estimates broken down by model (Haiku / Sonnet / Opus)

### Learn Mode
A built-in guided tutorial overlay for learning how to use the app's features.

### System Prompt Editor
Set a custom system prompt per session via the Settings modal.

---

## Getting Started

1. Open `wells-ai.html` in any modern browser.
2. Click the **Settings** (gear) icon.
3. Enter your Anthropic API key (`sk-ant-api03-...`). It is only held in memory and is gone when you refresh.
4. Start chatting.

> **Optional:** For web search, also add a Brave Search API key in Settings.

---

## Tech Stack

- Vanilla HTML / CSS / JavaScript — zero dependencies, zero build tools
- Anthropic Messages API (`https://api.anthropic.com/v1/messages`) with `anthropic-dangerous-direct-browser-access` header for direct browser use
- Browser `localStorage` for chat history and spend tracking
- Marked.js (loaded inline) for markdown rendering

---

## Notes

- Your API key is **never saved to disk or localStorage** — it lives only in memory and is cleared on page refresh.
- Cost estimates are approximations based on token counts; actual Anthropic charges may differ slightly.
- The file is fully self-contained — you can share it, back it up, or run it offline (after initial load).
