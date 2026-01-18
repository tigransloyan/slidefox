# Slidefox

A conversational AI presentation generator built with Next.js and Octavus. Users describe what they want, an AI autonomously generates slide images in real-time, and presentations are exported as PDFs.

## Features

- 🤖 **Agentic AI Generation** - Single prompt generates entire presentations autonomously
- 🎨 **Real-time Streaming** - Slides appear in the gallery as they're created
- 📱 **Three-Column Layout** - Conversation history, chat interface, and slide gallery
- 💾 **Session Persistence** - Restore conversations from localStorage (guests) or database (authenticated)
- 📄 **PDF Export** - One-click download of presentations
- 🎭 **Theme Support** - Modern, minimal, bold, corporate, and creative themes

## Getting Started

### Prerequisites

- Node.js 18+
- An Octavus account with API key
- Agent ID for the slidefox agent

### Installation

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

Create a `.env` file:

```bash
OCTAVUS_API_URL=https://octavus.ai
OCTAVUS_API_KEY=your-api-key-here
OCTAVUS_AGENT_ID=your-agent-id-here
```

3. Sync your agent (if using CLI):

```bash
npx @octavus/cli sync ./agent/slidefox
```

This will output your agent ID to add to `.env`. If you are not using CLI, you can zip and manually upload the agent to Octavus.ai and copy the agent ID from the UI.

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
slidefox/
├── app/
│   ├── actions.ts              # Server action for session creation
│   ├── api/
│   │   ├── trigger/route.ts    # SSE streaming endpoint
│   │   └── slides/pdf/route.ts # PDF generation endpoint
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Main page component
│   └── globals.css             # Global styles with brand colors
├── components/
│   ├── Slidefox.tsx            # Main chat component
│   ├── SlideGallery.tsx        # Slide thumbnails display
│   ├── ConversationHistory.tsx # Sidebar with session list
│   └── PDFExport.tsx           # PDF download button
├── lib/
│   ├── octavus.ts              # Octavus client configuration
│   ├── session.ts              # Session management
│   └── storage.ts              # localStorage helpers
├── agent/
│   └── slidefox/               # Agent definition
│       ├── protocol.yaml
│       ├── settings.json
│       └── prompts/
└── public/
    └── fox-logo.png            # Brand logo
```

## Usage

1. **Create a Presentation**: Type a description like "Create a 5-slide deck about climate change"
2. **Watch Slides Generate**: Slides stream in real-time to the right panel
3. **Stop Generation**: Click "Stop" to interrupt generation early
4. **Export PDF**: Click "Export PDF" when ready to download

## Brand Colors

- **Fox Orange** (`#FF6B35`) - Primary brand color
- **Light Orange** (`#FF8F5C`) - Hover states
- **Warm Brown** (`#5D4037`) - Text and icons
- **Cream White** (`#FFF8F5`) - Backgrounds

## Technology Stack

- **Frontend**: Next.js 14+ (App Router), React, Tailwind CSS
- **Agent Platform**: Octavus SDK (`@octavus/react`, `@octavus/server-sdk`)
- **LLM**: Claude Sonnet 4.5 (via Octavus)
- **Image Generation**: Gemini 2.5 Flash (via Octavus)
- **PDF Generation**: pdf-lib

## License

MIT
