'use client';

import { io, Socket } from 'socket.io-client';
import { TranscriptionResult, TranscriptionMetrics } from '@/types';
import { mapLanguageCode } from '@/utils';
import { Store } from 'easy-peasy';
import { StoreModel } from '@/store/types';

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
  private store: Store<StoreModel>;
  private isActive = false;
  private isConnecting = false;
  private onTranscription?: (result: TranscriptionResult) => void;
  private startTime: number = 0;
  private results: TranscriptionResult[] = [];
  private apiKey: string;
  private mediaRecorder?: MediaRecorder;
  private stream?: MediaStream;
  
  // PCM audio processing properties
  private audioContext?: AudioContext;
  private audioSource?: MediaStreamAudioSourceNode;
  private scriptProcessor?: ScriptProcessorNode;
  private audioSamples: number[] = [];
  private sendInterval?: NodeJS.Timeout;
  
  // Properties for consistent latency measurement using Deepgram's methodology
  private audioChunkTimestamps: Map<number, number> = new Map();
  private currentUtteranceStart: number = 0;
  private audioActivityDetected = false;
  private chunkCounter = 0;
  
  // Audio cursor tracking (cumulative seconds of audio sent) - matching Deepgram's approach
  private audioCursor: number = 0; // Total seconds of audio submitted
  private sessionStartTime: number = 0; // Session start timestamp
  private audioStreamStartTime: number = 0; // When audio streaming began

  constructor(apiKey: string, store: Store<StoreModel>) {
    this.apiKey = apiKey;
    this.store = store;
    console.log('Verbum service initialized');
  }

  async startTranscription(
    mediaStream: MediaStream,
    language: string,
    onTranscription?: (result: TranscriptionResult) => void
  ): Promise<void> {
    // Prevent multiple connections
    if (this.isActive || this.isConnecting) {
      console.log('⚠️ Verbum service already active or connecting, skipping...');
      return;
    }

    // Set callback - use store if no callback provided
    this.onTranscription = onTranscription || ((result) => {
      this.store.getActions().verbum.addResult(result);
    });
    this.startTime = Date.now();
    this.isActive = true;
    this.isConnecting = true;
    this.results = [];

    // Update store state
    this.store.getActions().verbum.setActive(true);
    this.store.getActions().verbum.setConnectionStatus('connecting');

    try {
      // Map language code to Verbum format
      const verbumLanguage = mapLanguageCode(language, 'verbum');
      
      // Connect to Verbum WebSocket
      await this.connectToVerbum(verbumLanguage);
      
      // Start audio processing and streaming
      await this.startAudioStreaming(mediaStream);

    } catch (error) {
      console.error('Error starting Verbum transcription:', error);
      this.isConnecting = false;
      this.store.getActions().verbum.setConnectionStatus('error');
      
      // Fallback to Web Speech API if Verbum connection fails
      console.log('🔄 Falling back to Web Speech API...');
      if (onTranscription) {
        await this.fallbackToWebSpeech(mediaStream, language, onTranscription);
      } else {
        // Use store for callback
        await this.fallbackToWebSpeech(mediaStream, language, (result) => {
          this.store.getActions().verbum.addResult(result);
        });
      }
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
          encoding: 'PCM',
          tags: JSON.stringify({ 
            project: 'real-time-demo' 
          }),
        },
        upgrade: true,
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to Verbum WebSocket');
        this.isActive = true;
        this.isConnecting = false;
        this.store.getActions().verbum.setConnectionStatus('connected');
        this.store.getActions().verbum.setActive(true);
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Verbum WebSocket connection error:', error);
        this.isConnecting = false;
        this.store.getActions().verbum.setConnectionStatus('error');
        reject(new Error(`Verbum connection failed: ${error.message}`));
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected from Verbum WebSocket:', reason);
        this.isActive = false;
        this.isConnecting = false;
        this.store.getActions().verbum.setConnectionStatus('disconnected');
        this.store.getActions().verbum.setActive(false);
      });

      // Listen for speech recognition results
      this.socket.on('speechRecognized', (data) => {
        this.handleSpeechResult(data);
      });

      // Connection timeout
      setTimeout(() => {
        if (!this.socket?.connected) {
          this.isConnecting = false;
          reject(new Error('Verbum connection timeout'));
        }
      }, 10000);
    });
  }

  private async startAudioStreaming(mediaStream: MediaStream): Promise<void> {
    try {
      this.stream = mediaStream;
      
      // Reset chunk counter and timestamps for new session
      this.chunkCounter = 0;
      this.audioChunkTimestamps.clear();
      this.currentUtteranceStart = 0;
      this.audioActivityDetected = false;
      
      // Reset audio cursor tracking for new session
      this.audioCursor = 0;
      this.sessionStartTime = Date.now();
      this.audioStreamStartTime = Date.now();
      
      // Clear audio samples buffer
      this.audioSamples = [];
      
      // PCM audio processing configuration (matching Vue.js implementation exactly)
      const sampleRate = 8000;        // 8kHz sample rate
      const bitsPerSample = 16;        // 16-bit samples
      const channelCount = 1;          // Mono (1 channel)
      
      // Create AudioContext with the specified sample rate
      this.audioContext = new AudioContext({ sampleRate });
      this.audioSource = this.audioContext.createMediaStreamSource(mediaStream);
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      // Process audio data (convert to PCM 16-bit)
      this.scriptProcessor.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        for (let i = 0; i < input.length; i++) {
          // Convert floating point sample to 16-bit signed integer
          const sample = Math.round(input[i] * 0x7fff);
          this.audioSamples.push(sample);
        }
      };

      // Connect audio processing chain
      this.audioSource.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);

      // Calculate chunk size for PCM data
      const chunkSize = (sampleRate * channelCount * bitsPerSample) / 8;
      
      // Start sending audio data to the server (every 20ms like Vue.js implementation)
      this.sendInterval = setInterval(() => {
        if (this.audioSamples.length >= chunkSize) {
          const chunk = this.audioSamples.splice(0, chunkSize);
          
          // Encode chunk as a little-endian, 16-bit, signed integer array
          const buffer = new ArrayBuffer(chunk.length * 2);
          const view = new DataView(buffer);
          
          for (let i = 0; i < chunk.length; i++) {
            view.setInt16(i * 2, chunk[i], true); // true = little endian
          }

          // Detect audio activity using PCM data
          const hasActivity = this.detectAudioActivity(buffer);
          
          // Mark utterance start if we detect activity
          if (!this.audioActivityDetected && hasActivity) {
            this.currentUtteranceStart = Date.now();
            this.audioActivityDetected = true;
            console.log('🗣️ Speech activity detected, starting utterance timing');
          }

          // Send to Verbum WebSocket if connected
          if (this.socket?.connected && this.isActive) {
            this.socket.emit('audioStream', buffer);
            
            // Update audio cursor: track duration based on chunk interval
            const chunkDurationSeconds = 0.02; // 20ms chunk duration
            this.audioCursor += chunkDurationSeconds;
            
            // Store timestamp for this audio chunk
            const chunkId = this.chunkCounter++;
            this.audioChunkTimestamps.set(chunkId, Date.now());
            
            // Clean up old timestamps periodically
            if (chunkId % 50 === 0) { // Every 50 chunks (~1 second)
              console.log(`📊 Audio Cursor: ${this.audioCursor.toFixed(3)}s (${chunkId} PCM chunks sent)`);
              this.cleanupOldTimestamps();
            }
          }
        }
      }, 20); // Send every 20ms (matching Vue.js implementation)

      console.log('🎙️ Started PCM audio streaming to Verbum (8kHz, 16-bit, mono)');
    } catch (error) {
      console.error('Error starting PCM audio streaming:', error);
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
      offset,
      words
    } = data;

    if (!text || !text.trim()) return;

    const resultTimestamp = Date.now();
    let calculatedLatency = 0;

    // Use Deepgram's official latency methodology: Audio Cursor (X) - Transcript Cursor (Y)
    // Apply to interim results (status !== 'recognized') to match Deepgram's approach
    if (status !== 'recognized' && offset !== undefined && duration !== undefined) {
      // Audio Cursor (X): Total seconds of audio submitted so far
      const audioCursorX = this.audioCursor;
      
      // Transcript Cursor (Y): offset + duration from the transcript result
      // Note: Verbum uses 'offset' similar to Deepgram's 'start'
      const transcriptCursorY = offset + duration;
      
      // Latency = X - Y (convert to milliseconds)
      calculatedLatency = Math.max(0, (audioCursorX - transcriptCursorY) * 1000);
      
      console.log(`📊 Verbum official latency: ${calculatedLatency.toFixed(1)}ms (Audio: ${audioCursorX.toFixed(3)}s - Transcript: ${transcriptCursorY.toFixed(3)}s) for "${text.substring(0, 30)}..."`);
    } else if (status === 'recognized') {
      // For final results, use fallback method or previous calculation
      if (this.currentUtteranceStart > 0) {
        calculatedLatency = resultTimestamp - this.currentUtteranceStart;
        console.log(`📊 Verbum fallback latency (final): ${calculatedLatency}ms`);
      }
    } else {
      // Fallback for cases without proper timing data
      if (this.audioChunkTimestamps.size > 0) {
        const recentTimestamps = Array.from(this.audioChunkTimestamps.values())
          .filter(timestamp => timestamp > resultTimestamp - 3000)
          .sort((a, b) => b - a);
        
        if (recentTimestamps.length > 0) {
          calculatedLatency = resultTimestamp - recentTimestamps[0];
          console.log(`📊 Verbum chunk-based latency: ${calculatedLatency}ms`);
        }
      }
    }

    // Reset utterance timing for final results to prepare for next utterance
    if (status === 'recognized') {
      this.audioActivityDetected = false;
      this.currentUtteranceStart = 0;
    }

    const result: TranscriptionResult = {
      text: text.trim(),
      timestamp: resultTimestamp,
      confidence: typeof confidence === 'number' ? confidence : 
                  confidence === 'high' ? 0.9 : 
                  confidence === 'medium' ? 0.7 : 
                  confidence === 'low' ? 0.5 : 0.8,
      isFinal: status === 'recognized',
      latency: Math.max(0, calculatedLatency) // Store individual utterance latency
    };

    this.results.push(result);

    // Call the transcription callback
    this.onTranscription!(result);

    // Update metrics in store for final results
    if (result.isFinal) {
      const currentResults = this.store.getState().verbum.results;
      const metrics = this.calculateMetrics(currentResults);
      this.store.getActions().verbum.updateMetrics(metrics);
      
      console.log('🎯 Verbum Final Result:', {
        text: result.text,
        confidence: result.confidence,
        duration: duration,
        language: language,
        wordsCount: words?.length || 0,
        metrics: metrics
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
    this.isConnecting = false;

    // Send stream end signal
    if (this.socket?.connected) {
      this.socket.emit('streamEnd');
    }

    // Clean up PCM audio processing
    if (this.sendInterval) {
      clearInterval(this.sendInterval);
      this.sendInterval = undefined;
    }
    
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = undefined;
    }
    
    if (this.audioSource) {
      this.audioSource.disconnect();
      this.audioSource = undefined;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = undefined;
    }
    
    // Clear audio samples buffer
    this.audioSamples = [];

    // Clean up MediaRecorder (if used for fallback)
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

    // Calculate and update final metrics
    if (this.results.length > 0) {
      const finalMetrics = this.calculateMetrics(this.results);
      this.store.getActions().verbum.updateMetrics(finalMetrics);
      console.log('📊 Final Verbum metrics:', finalMetrics);
    }

    // Update connection status
    this.store.getActions().verbum.setConnectionStatus('disconnected');
    this.store.getActions().verbum.setActive(false);

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

    // Calculate average latency using individual utterance latencies
    const latencies = finalResults
      .filter(r => r.latency !== undefined && r.latency > 0)
      .map(r => r.latency!);
    
    const avgLatency = latencies.length > 0 
      ? latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length
      : 0;

    console.log(`📊 Calculated average latency: ${avgLatency}ms from ${latencies.length} utterances`);
    console.log(`📊 Individual latencies: [${latencies.join(', ')}]ms`);
    
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

  /**
   * Detect if audio chunk has speech activity
   * Simple volume-based detection with proper buffer handling
   */
  private detectAudioActivity(audioData: ArrayBuffer): boolean {
    try {
      // Check if buffer size is valid for Int16Array (must be multiple of 2)
      if (audioData.byteLength === 0 || audioData.byteLength % 2 !== 0) {
        // For non-PCM data (like OPUS), use simple byte-level activity detection
        const uint8Array = new Uint8Array(audioData);
        const threshold = 10; // Lower threshold for encoded data
        let activity = 0;
        
        for (let i = 0; i < uint8Array.length; i++) {
          if (uint8Array[i] > threshold) {
            activity++;
          }
        }
        
        // Consider active if more than 10% of bytes show activity
        return (activity / uint8Array.length) > 0.1;
      }
      
      // For PCM data, use RMS calculation
      const int16Array = new Int16Array(audioData);
      const threshold = 500;
      let sumSquares = 0;
      
      for (let i = 0; i < int16Array.length; i++) {
        sumSquares += int16Array[i] * int16Array[i];
      }
      
      const rms = Math.sqrt(sumSquares / int16Array.length);
      return rms > threshold;
      
    } catch (error) {
      console.warn('⚠️ Audio activity detection failed:', error);
      // Fallback: assume there's activity if we have data
      return audioData.byteLength > 0;
    }
  }

  /**
   * Clean up old audio chunk timestamps (older than 10 seconds)
   */
  private cleanupOldTimestamps(): void {
    const cutoffTime = Date.now() - 10000; // 10 seconds ago
    for (const [chunkId, timestamp] of this.audioChunkTimestamps.entries()) {
      if (timestamp < cutoffTime) {
        this.audioChunkTimestamps.delete(chunkId);
      }
    }
  }
}