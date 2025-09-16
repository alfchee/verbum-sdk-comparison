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
  
  // Properties for proper per-utterance latency tracking
  private audioChunkTimestamps: Map<number, number> = new Map();
  private currentUtteranceStart: number = 0;
  private audioActivityDetected = false;
  private chunkCounter = 0;

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
          
          const chunkId = this.chunkCounter++;
          const chunkTimestamp = Date.now();
          
          // Store timestamp for this audio chunk
          this.audioChunkTimestamps.set(chunkId, chunkTimestamp);
          
          // Convert blob to ArrayBuffer for activity detection
          event.data.arrayBuffer().then((buffer) => {
            // Detect audio activity - for OPUS data, use size-based detection as primary method
            const hasActivity = buffer.byteLength > 100 || this.detectAudioActivity(buffer);
            
            // Mark utterance start if we haven't detected activity yet and now we do
            if (!this.audioActivityDetected && hasActivity) {
              this.currentUtteranceStart = chunkTimestamp;
              this.audioActivityDetected = true;
              console.log('🗣️ Speech activity detected, starting utterance timing');
            }

            // Send to websocket if connected
            if (this.socket?.connected && this.isActive) {
              this.socket.emit('audioStream', buffer);
            }
          }).catch((error) => {
            console.error('❌ Error processing audio chunk:', error);
          });
          
          // Clean up old timestamps periodically
          if (chunkId % 20 === 0) { // Every 20 chunks
            this.cleanupOldTimestamps();
          }
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

    const resultTimestamp = Date.now();
    let calculatedLatency = 0;

    // Calculate per-utterance latency
    if (this.currentUtteranceStart > 0) {
      // Use current utterance start time (most accurate for speech-to-text)
      calculatedLatency = resultTimestamp - this.currentUtteranceStart;
      console.log(`📊 Utterance latency: ${calculatedLatency}ms for "${text.substring(0, 30)}..."`);
    } else if (this.audioChunkTimestamps.size > 0) {
      // Fallback: use most recent audio chunk timestamp
      const recentTimestamps = Array.from(this.audioChunkTimestamps.values())
        .filter(timestamp => timestamp > resultTimestamp - 3000) // Last 3 seconds
        .sort((a, b) => b - a); // Most recent first
      
      if (recentTimestamps.length > 0) {
        calculatedLatency = resultTimestamp - recentTimestamps[0];
        console.log(`📊 Chunk-based latency: ${calculatedLatency}ms`);
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