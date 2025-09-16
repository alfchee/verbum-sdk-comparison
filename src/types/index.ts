// Global type definitions for the STT Compare application

export interface Language {
  code: string;
  name: string;
  flag: string;
}

export interface TranscriptionResult {
  text: string;
  timestamp: number;
  confidence?: number;
  isFinal: boolean;
  latency?: number; // Per-utterance latency in milliseconds
}

export interface TranscriptionMetrics {
  latency: number;
  accuracy: number;
  wordCount: number;
}

export interface BenchmarkData {
  deepgram: {
    accuracy: number;
    latency: number;
  };
  verbum: {
    accuracy: number;
    latency: number;
  };
}

export interface STTServiceInterface {
  startTranscription(
    mediaStream: MediaStream,
    language: string,
    onTranscription: (result: TranscriptionResult) => void
  ): Promise<void>;
  
  stopTranscription(): void;
  
  calculateMetrics(results: TranscriptionResult[]): TranscriptionMetrics;
}

// Web Speech API types (for TypeScript support)
export interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message?: string;
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    start(): void;
    stop(): void;
  }

  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }

  const SpeechRecognition: {
    prototype: SpeechRecognition;
    new (): SpeechRecognition;
  };
}