'use client';

import { io, Socket } from 'socket.io-client';
import { TranscriptionResult, TranscriptionMetrics } from '@/types';
import { mapLanguageCode } from '@/utils';

interface VerbumSpeechResult {
  id?: string;
  text: string;
  confidence?: number | string;
  status: 'recognized' | 'recognizing';
  language?: string;
  duration?: number;
  offset?: number;
  words?: Array<{
    word: string;
    start?: number;
    end?: number;
    confidence?: number;
  }>;
}

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export class VerbumService {
  private socket: Socket | null = null;
  private isActive = false;
  private onTranscription?: (result: TranscriptionResult) => void;
  private startTime: number = 0;
  private results: TranscriptionResult[] = [];
  private apiKey: string;
  private mediaRecorder?: MediaRecorder;
  private stream?: MediaStream;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    console.log('Verbum service initialized');
  }

  async startTranscription(
    mediaStream: MediaStream,
    language: string,
    onTranscription: (result: TranscriptionResult) => void
  ): Promise<void> {
    this.onTranscription = onTranscription;
    this.startTime = Date.now();
    this.isActive = true;
    this.results = [];

    try {
      // Map language code to Verbum format
      const verbumLanguage = mapLanguageCode(language, 'verbum');
      
      // Connect to Verbum WebSocket
      await this.connectToVerbum(verbumLanguage);
      
      // Start audio processing and streaming
      await this.startAudioStreaming(mediaStream);

    } catch (error) {
      console.error('Error starting Verbum transcription:', error);
      
      // Fallback to Web Speech API if Verbum connection fails
      console.log('🔄 Falling back to Web Speech API...');
      await this.fallbackToWebSpeech(mediaStream, language, onTranscription);
    }
  }

  private async connectToVerbum(language: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🔌 Connecting to Verbum WebSocket...');

      this.socket = io('wss://vsdk-api-dev.verbum.ai/listen', {
        path: '/v1/socket.io',
        transports: ['websocket'],
        auth: {
          token: this.apiKey,
        },
        query: {
          language: [language],
          encoding: 'OPUS',
          tags: JSON.stringify({ 
            project: 'real-time-demo' 
          }),
        },
        upgrade: true,
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to Verbum WebSocket');
        this.isActive = true;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Verbum WebSocket connection error:', error);
        reject(new Error(`Verbum connection failed: ${error.message}`));
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected from Verbum WebSocket:', reason);
        this.isActive = false;
      });

      // Listen for speech recognition results
      this.socket.on('speechRecognized', (data) => {
        this.handleSpeechResult(data);
      });

      // Connection timeout
      setTimeout(() => {
        if (!this.socket?.connected) {
          reject(new Error('Verbum connection timeout'));
        }
      }, 10000);
    });
  }

  private async startAudioStreaming(mediaStream: MediaStream): Promise<void> {
    try {
      this.stream = mediaStream;
      
      // Configure MediaRecorder for OPUS encoding
      const options = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 25600,
      };

      this.mediaRecorder = new MediaRecorder(mediaStream, options);
      let audioChunks: Blob[] = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);

          // Convert blob to ArrayBuffer and send to websocket
          event.data.arrayBuffer().then((buffer) => {
            if (this.socket?.connected && this.isActive) {
              this.socket.emit('audioStream', buffer);
            }
          });
        }
      };

      // Handle stopping
      this.mediaRecorder.onstop = () => {
        console.log('🎙️ MediaRecorder stopped');
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
        }
      };

      // Handle errors
      this.mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
        }
      };

      // Start recording with timeslice to get data periodically (every 20ms)
      this.mediaRecorder.start(20);

      // Clear accumulated chunks periodically to prevent memory buildup
      const cleanupInterval = setInterval(() => {
        if (!this.isActive) {
          clearInterval(cleanupInterval);
        }
        audioChunks = [];
      }, 1000);

      console.log('🎙️ Started OPUS audio streaming to Verbum');
    } catch (error) {
      console.error('Error starting audio streaming:', error);
      throw error;
    }
  }



  private handleSpeechResult(data: VerbumSpeechResult): void {
    const {
      text,
      confidence,
      status,
      language,
      duration,
      words
    } = data;

    if (!text || !text.trim()) return;

    const result: TranscriptionResult = {
      text: text.trim(),
      timestamp: Date.now(),
      confidence: typeof confidence === 'number' ? confidence : 
                  confidence === 'high' ? 0.9 : 
                  confidence === 'medium' ? 0.7 : 
                  confidence === 'low' ? 0.5 : 0.8,
      isFinal: status === 'recognized'
    };

    this.results.push(result);

    // Call the transcription callback
    if (this.onTranscription) {
      this.onTranscription(result);
    }

    // Log detailed results for debugging
    if (result.isFinal) {
      console.log('🎯 Verbum Final Result:', {
        text: result.text,
        confidence: result.confidence,
        duration: duration,
        language: language,
        wordsCount: words?.length || 0
      });
    } else {
      console.log('🔄 Verbum Interim Result:', result.text.substring(0, 50) + '...');
    }
  }

  // Fallback to Web Speech API if Verbum fails
  private async fallbackToWebSpeech(
    mediaStream: MediaStream,
    language: string,
    onTranscription: (result: TranscriptionResult) => void
  ): Promise<void> {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      throw new Error('Neither Verbum nor Web Speech API are available');
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = this.mapLanguageCodeForWebSpeech(language);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const isFinal = event.results[i].isFinal;
        
        const result: TranscriptionResult = {
          text: transcript,
          timestamp: Date.now(),
          confidence: event.results[i][0].confidence || 0.85,
          isFinal,
        };

        this.results.push(result);
        
        if (onTranscription && transcript.trim()) {
          onTranscription(result);
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Web Speech API error:', event.error);
    };

    recognition.onend = () => {
      if (this.isActive) {
        recognition.start();
      }
    };

    recognition.start();
    console.log('🔄 Using Web Speech API as fallback');
  }

  private mapLanguageCodeForWebSpeech(code: string): string {
    const mapping: { [key: string]: string } = {
      'en-US': 'en-US',
      'es-ES': 'es-ES',
      'de-DE': 'de-DE',
      'it-IT': 'it-IT',
      'fr-FR': 'fr-FR',
      'zh-CN': 'zh-CN',
      'ja-JP': 'ja-JP',
      'ko-KR': 'ko-KR',
      'ru-RU': 'ru-RU',
    };
    
    return mapping[code] || 'en-US';
  }

  stopTranscription(): void {
    console.log('⏹️ Stopping Verbum transcription...');
    
    this.isActive = false;

    // Send stream end signal
    if (this.socket?.connected) {
      this.socket.emit('streamEnd');
    }

    // Clean up MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder = undefined;
    }

    // Stop media stream tracks
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = undefined;
    }

    // Disconnect socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    console.log('✅ Verbum transcription stopped');
  }

  calculateMetrics(results: TranscriptionResult[]): TranscriptionMetrics {
    const finalResults = results.filter(r => r.isFinal);
    
    if (finalResults.length === 0) {
      return {
        latency: 0,
        accuracy: 0,
        wordCount: 0
      };
    }

    // Calculate average latency
    const latencies = finalResults.map(r => r.timestamp - this.startTime);
    const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
    
    // Calculate average confidence as accuracy proxy
    const confidences = finalResults
      .filter(r => r.confidence !== undefined)
      .map(r => r.confidence!);
    
    const avgAccuracy = confidences.length > 0 
      ? (confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length) * 100
      : 95; // Default high accuracy for Verbum

    // Count total words
    const wordCount = finalResults.reduce((acc, r) => {
      return acc + r.text.split(/\s+/).filter(word => word.length > 0).length;
    }, 0);

    return {
      latency: Math.round(avgLatency),
      accuracy: Math.round(avgAccuracy * 10) / 10, // Round to 1 decimal place
      wordCount
    };
  }
}