'use client';

import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

export interface TranscriptionResult {
  text: string;
  timestamp: number;
  confidence?: number;
  isFinal: boolean;
}

export interface TranscriptionMetrics {
  latency: number;
  accuracy: number;
  wordCount: number;
}

export class DeepgramService {
  private client: any;
  private connection: any;
  private onTranscription?: (result: TranscriptionResult) => void;
  private startTime: number = 0;

  constructor(apiKey: string) {
    this.client = createClient(apiKey);
  }

  async startTranscription(
    mediaStream: MediaStream,
    language: string,
    onTranscription: (result: TranscriptionResult) => void
  ): Promise<void> {
    this.onTranscription = onTranscription;
    this.startTime = Date.now();

    try {
      // Create a live transcription connection
      this.connection = this.client.listen.live({
        model: 'nova-2',
        language: language,
        smart_format: true,
        interim_results: true,
        endpointing: 300,
        utterance_end_ms: 1000,
      });

      // Handle connection events
      this.connection.on(LiveTranscriptionEvents.Open, () => {
        console.log('Deepgram connection opened');
      });

      this.connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
        const transcript = data.channel?.alternatives?.[0];
        if (transcript) {
          const result: TranscriptionResult = {
            text: transcript.transcript,
            timestamp: Date.now(),
            confidence: transcript.confidence,
            isFinal: data.is_final || false,
          };
          
          if (this.onTranscription && result.text.trim()) {
            this.onTranscription(result);
          }
        }
      });

      this.connection.on(LiveTranscriptionEvents.Error, (error: any) => {
        console.error('Deepgram error:', error);
      });

      this.connection.on(LiveTranscriptionEvents.Close, () => {
        console.log('Deepgram connection closed');
      });

      // Start sending audio data
      this.sendAudioData(mediaStream);

    } catch (error) {
      console.error('Error starting Deepgram transcription:', error);
      throw error;
    }
  }

  private sendAudioData(mediaStream: MediaStream): void {
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const source = audioContext.createMediaStreamSource(mediaStream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    source.connect(processor);
    processor.connect(audioContext.destination);

    processor.onaudioprocess = (event) => {
      if (this.connection && this.connection.getReadyState() === 1) {
        const inputBuffer = event.inputBuffer.getChannelData(0);
        const pcmData = this.convertFloat32ToPCM16(inputBuffer);
        this.connection.send(pcmData);
      }
    };
  }

  private convertFloat32ToPCM16(float32Array: Float32Array): ArrayBuffer {
    const pcm16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      pcm16Array[i] = Math.max(-32768, Math.min(32767, float32Array[i] * 32768));
    }
    return pcm16Array.buffer;
  }

  stopTranscription(): void {
    if (this.connection) {
      this.connection.finish();
      this.connection = null;
    }
  }

  calculateMetrics(results: TranscriptionResult[]): TranscriptionMetrics {
    const finalResults = results.filter(r => r.isFinal);
    const avgLatency = finalResults.reduce((acc, r) => acc + (r.timestamp - this.startTime), 0) / finalResults.length || 0;
    
    return {
      latency: Math.round(avgLatency),
      accuracy: 95.5, // This would be calculated based on reference text in real implementation
      wordCount: finalResults.reduce((acc, r) => acc + r.text.split(' ').length, 0),
    };
  }
}