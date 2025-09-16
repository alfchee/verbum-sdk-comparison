# STT Compare - Deepgram vs Verbum

A Next.js application for comparing real-time speech-to-text transcription between Deepgram and Verbum SDKs.

## Features

- **Real-time Transcription**: Side-by-side comparison of Deepgram and Verbum STT performance
- **Multi-language Support**: Support for 9 languages (English, Spanish, German, Italian, French, Chinese, Japanese, Korean, Russian)
- **Performance Metrics**: Real-time accuracy and latency tracking
- **Interactive Benchmarks**: Visual comparison charts for accuracy and latency
- **Responsive Design**: Modern dark theme with mobile-friendly interface

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Icons**: Heroicons
- **Audio Recording**: Web Audio API
- **STT SDKs**: 
  - Deepgram SDK (mock implementation)
  - **Verbum SDK (real WebSocket integration)** with Web Speech API fallback

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Deepgram API key
- Verbum API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd stt-compare
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

4. Add your Verbum API key to `.env.local`:
```env
# Required for real Verbum transcription
NEXT_PUBLIC_VERBUM_API_KEY=your_verbum_api_key_here

# Optional - Deepgram is currently mocked
NEXT_PUBLIC_DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

> **Note**: Get your Verbum API key from [sdk.verbum.ai](https://sdk.verbum.ai/). The app includes automatic fallback to Web Speech API if the key is not provided.

5. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Select Language**: Choose from 9 supported languages using the dropdown
2. **Start Recording**: Click "Start Recording" to begin real-time transcription
3. **View Results**: Watch as both Deepgram and Verbum transcribe your speech side-by-side
4. **Stop Recording**: Click "Stop Recording" to end the session and view final metrics
5. **Compare Performance**: Review the benchmark charts for accuracy and latency comparison

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page component
├── components/            # React components
│   ├── Header.tsx         # Navigation header
│   ├── Footer.tsx         # Footer component
│   ├── LanguageSelector.tsx    # Language dropdown
│   ├── RecordingControls.tsx   # Start/stop recording
│   ├── TranscriptionCard.tsx   # STT result display
│   └── BenchmarkVisualization.tsx  # Performance charts
├── hooks/                 # Custom React hooks
│   └── useAudioRecording.ts    # Audio recording logic
├── services/              # STT service integrations
│   ├── deepgramService.ts      # Deepgram SDK integration
│   └── verbumService.ts        # Verbum SDK integration
└── config/                # Configuration files
    └── index.ts           # Environment config
```

## Key Components

### Audio Recording
- **useAudioRecording**: Custom hook for microphone access and audio streaming
- Real-time audio capture with proper cleanup
- Error handling for microphone permissions

### STT Services
- **DeepgramService**: Integration with Deepgram's real-time STT API
- **VerbumService**: Integration with Verbum SDK (with Web Speech API fallback)
- Performance metrics calculation for both services

### Real-time Transcription
- Side-by-side display of transcription results
- Visual indicators for recording status
- Performance metrics (latency, accuracy) display

### Benchmarking
- Real-time accuracy and latency tracking
- Animated charts for visual comparison
- Responsive design for mobile and desktop

## Browser Compatibility

- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Edge**: Full support

Note: Microphone access requires HTTPS in production.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
