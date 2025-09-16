'use client';

import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { TranscriptionResult, TranscriptionMetrics } from '../types';
import { Store } from 'easy-peasy';
import { StoreModel } from '../store/types';

interface DeepgramResponse {
  type: string;
  channel_index: number[];
  duration: number;
  start: number;
  is_final: boolean;
  speech_final: boolean;
  channel: {
    alternatives: Array<{
      transcript: string;
      confidence: number;
      words?: Array<{
        word: string;
        start: number;
        end: number;
        confidence: number;
        punctuated_word: string;
      }>;
    }>;
  };
  metadata?: {
    request_id: string;
    model_info: {
      name: string;
      version: string;
      arch: string;
    };
    model_uuid: string;
  };
}

export class DeepgramService {
  private client: any;
  private connection: any;
  private store: Store<StoreModel>;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private isActive: boolean = false;
  private connectionStartTime: number = 0;
  
    // Properties for Deepgram's official latency measurement (audio cursor - transcript cursor)
  private audioActivityDetected: boolean = false;
  private currentUtteranceStart: number = 0;
  private chunkCounter: number = 0;
  private audioChunkTimestamps: Map<number, number> = new Map();
  
  // Audio cursor tracking (cumulative seconds of audio sent)
  private audioCursor: number = 0; // Total seconds of audio submitted
  private sessionStartTime: number = 0; // Session start timestamp
  private audioStreamStartTime: number = 0; // When audio streaming began

  constructor(apiKey: string, store: Store<StoreModel>) {
    try {
      this.client = createClient(apiKey);
      this.store = store;
      console.log('✅ Deepgram client initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Deepgram client:', error);
      throw error;
    }
  }

  async startTranscription(mediaStream: MediaStream, language = 'en-US'): Promise<void> {
    if (this.isActive) {
      console.log('🔄 Deepgram service already active, stopping current session');
      await this.stopTranscription();
    }

    try {
      console.log('🎤 Starting Deepgram transcription...');
      
      // Reset state for fresh start
      this.store.getActions().deepgram.reset();
      this.connectionStartTime = Date.now();
      this.isActive = true;
      
      // Update connection status
      this.store.getActions().deepgram.setConnectionStatus('connecting');
      this.store.getActions().deepgram.setActive(true);

      // Create WebSocket connection using the correct API
      this.connection = this.client.listen.live({
        model: 'nova-2',
        language: language,
        smart_format: true,
        interim_results: true,
        endpointing: 300,
        utterance_end_ms: 1000,
        encoding: 'linear16',
        sample_rate: 16000,
        channels: 1,
      });

      // Setup event handlers
      this.setupEventHandlers();

      console.log('✅ Deepgram WebSocket connection established');
      this.store.getActions().deepgram.setConnectionStatus('connected');

      // Start audio streaming
      await this.startAudioStreaming(mediaStream);

    } catch (error) {
      console.error('❌ Error starting Deepgram transcription:', error);
      this.isActive = false;
      this.store.getActions().deepgram.setConnectionStatus('error');
      this.store.getActions().deepgram.setActive(false);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.connection) return;

    this.connection.addListener(LiveTranscriptionEvents.Open, () => {
      console.log('✅ Deepgram WebSocket connection opened');
      this.store.getActions().deepgram.setConnectionStatus('connected');
    });

    this.connection.addListener(LiveTranscriptionEvents.Transcript, (data: any) => {
      this.handleTranscriptResult(data);
    });

    this.connection.addListener(LiveTranscriptionEvents.Error, (error: any) => {
      console.error('❌ Deepgram WebSocket error:', error);
      this.store.getActions().deepgram.setConnectionStatus('error');
    });

    this.connection.addListener(LiveTranscriptionEvents.Close, () => {
      console.log('🔌 Deepgram WebSocket connection closed');
      this.store.getActions().deepgram.setConnectionStatus('disconnected');
      this.isActive = false;
      this.store.getActions().deepgram.setActive(false);
    });

    this.connection.addListener(LiveTranscriptionEvents.Warning, (warning: any) => {
      console.warn('⚠️ Deepgram warning:', warning);
    });

    this.connection.addListener(LiveTranscriptionEvents.Metadata, (metadata: any) => {
      console.log('📊 Deepgram metadata:', metadata);
    });
  }

  private handleTranscriptResult(data: any): void {
    // Handle Deepgram's response format
    const transcript = data.channel?.alternatives?.[0];
    if (!transcript || !transcript.transcript || !transcript.transcript.trim()) return;

    const resultTimestamp = Date.now();
    let calculatedLatency = 0;

    // Use Deepgram's official latency methodology: Audio Cursor (X) - Transcript Cursor (Y)
    // Only calculate for interim results as recommended by Deepgram
    if (!data.is_final && transcript.start !== undefined && transcript.duration !== undefined) {
      // Audio Cursor (X): Total seconds of audio submitted so far
      const audioCursorX = this.audioCursor;
      
      // Transcript Cursor (Y): start + duration from the transcript result
      const transcriptCursorY = transcript.start + transcript.duration;
      
      // Latency = X - Y (convert to milliseconds)
      calculatedLatency = Math.max(0, (audioCursorX - transcriptCursorY) * 1000);
      
      console.log(`📊 Deepgram official latency: ${calculatedLatency.toFixed(1)}ms (Audio: ${audioCursorX.toFixed(3)}s - Transcript: ${transcriptCursorY.toFixed(3)}s) for "${transcript.transcript.substring(0, 30)}..."`);
    } else if (data.is_final) {
      // For final results, use fallback method or previous calculation
      if (this.currentUtteranceStart > 0) {
        calculatedLatency = resultTimestamp - this.currentUtteranceStart;
        console.log(`📊 Deepgram fallback latency (final): ${calculatedLatency}ms`);
      }
      
      // Reset utterance timing for final results
      this.audioActivityDetected = false;
      this.currentUtteranceStart = 0;
    }

    const result: TranscriptionResult = {
      text: transcript.transcript.trim(),
      timestamp: resultTimestamp,
      confidence: transcript.confidence || 0.95,
      isFinal: data.is_final || false,
      latency: Math.max(0, calculatedLatency)
    };

    // Add result to store
    this.store.getActions().deepgram.addResult(result);

    // Update metrics periodically
    if (data.is_final) {
      const currentResults = this.store.getState().deepgram.results;
      const metrics = this.calculateMetrics(currentResults);
      this.store.getActions().deepgram.updateMetrics(metrics);
    }
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
      
      // Use AudioContext for more direct audio processing
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(mediaStream);
      const processor = audioContext.createScriptProcessor(1024, 1, 1);

      source.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = (event) => {
        if (!this.connection || !this.isActive) return;

        const chunkId = this.chunkCounter++;
        const chunkTimestamp = Date.now();
        
        // Store timestamp for this audio chunk
        this.audioChunkTimestamps.set(chunkId, chunkTimestamp);

        const inputBuffer = event.inputBuffer.getChannelData(0);
        
        // Detect audio activity using RMS
        const hasActivity = this.detectAudioActivityFromFloat32(inputBuffer);
        
        // Mark utterance start if we haven't detected activity yet and now we do
        if (!this.audioActivityDetected && hasActivity) {
          this.currentUtteranceStart = chunkTimestamp;
          this.audioActivityDetected = true;
          console.log('🗣️ Deepgram speech activity detected, starting utterance timing');
        }

        // Convert Float32 to PCM16 and send
        const pcmData = this.convertFloat32ToPCM16(inputBuffer);
        this.connection.send(pcmData);
        
        // Update audio cursor: add duration of this audio chunk
        // AudioContext uses 1024 samples at 16kHz = 1024/16000 = 0.064 seconds per chunk
        const chunkDurationSeconds = inputBuffer.length / 16000;
        this.audioCursor += chunkDurationSeconds;
        
        // Debug logging every 50 chunks (~3.2 seconds)
        if (chunkId % 50 === 0) {
          console.log(`📊 Audio Cursor: ${this.audioCursor.toFixed(3)}s (${chunkId} chunks sent)`);
          this.cleanupOldTimestamps();
        }
      };

      console.log('🎤 Deepgram audio streaming started');

    } catch (error) {
      console.error('❌ Error starting Deepgram audio streaming:', error);
      throw error;
    }
  }

  private detectAudioActivityFromFloat32(float32Array: Float32Array): boolean {
    const threshold = 0.01; // Threshold for Float32 audio data
    let sumSquares = 0;
    
    for (let i = 0; i < float32Array.length; i++) {
      sumSquares += float32Array[i] * float32Array[i];
    }
    
    const rms = Math.sqrt(sumSquares / float32Array.length);
    return rms > threshold;
  }

  private convertFloat32ToPCM16(float32Array: Float32Array): ArrayBuffer {
    const pcm16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      pcm16Array[i] = Math.max(-32768, Math.min(32767, float32Array[i] * 32768));
    }
    return pcm16Array.buffer;
  }

  private convertAndSendAudio(buffer: ArrayBuffer): void {
    try {
      // Send audio data to Deepgram
      if (this.connection && this.isActive) {
        // Convert ArrayBuffer to the format expected by Deepgram
        const uint8Array = new Uint8Array(buffer);
        this.connection.send(uint8Array);
      }
    } catch (error) {
      console.error('❌ Error sending audio to Deepgram:', error);
    }
  }



  async stopTranscription(): Promise<void> {
    if (!this.isActive) {
      console.log('⚠️ Deepgram service is not active');
      return;
    }

    console.log('🛑 Stopping Deepgram transcription...');
    this.isActive = false;
    this.store.getActions().deepgram.setActive(false);

    try {
      // Stop MediaRecorder
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
        this.mediaRecorder = null;
      }

      // Stop media stream tracks
      if (this.stream) {
        this.stream.getTracks().forEach(track => {
          track.stop();
        });
        this.stream = null;
      }

      // Close WebSocket connection
      if (this.connection) {
        this.connection.finish();
        this.connection = null;
      }

      // Update connection status
      this.store.getActions().deepgram.setConnectionStatus('disconnected');

      // Final metrics calculation
      const currentResults = this.store.getState().deepgram.results;
      if (currentResults.length > 0) {
        const finalMetrics = this.calculateMetrics(currentResults);
        this.store.getActions().deepgram.updateMetrics(finalMetrics);
      }

    } catch (error) {
      console.error('❌ Error stopping Deepgram transcription:', error);
    }

    console.log('✅ Deepgram transcription stopped');
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

    console.log(`📊 Deepgram calculated average latency: ${avgLatency}ms from ${latencies.length} utterances`);
    console.log(`📊 Deepgram individual latencies: [${latencies.join(', ')}]ms`);
    
    // Calculate average confidence as accuracy proxy
    const confidences = finalResults
      .filter(r => r.confidence !== undefined)
      .map(r => r.confidence!);
    
    const avgAccuracy = confidences.length > 0 
      ? (confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length) * 100
      : 95; // Default high accuracy for Deepgram

    // Count total words
    const wordCount = finalResults.reduce((acc, r) => {
      return acc + r.text.split(/\s+/).filter(word => word.length > 0).length;
    }, 0);

    return {
      latency: Math.round(avgLatency),
      accuracy: Math.round(avgAccuracy * 10) / 10,
      wordCount
    };
  }

  /**
   * Detect if audio chunk has speech activity
   * Similar implementation to VerbumService
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
      console.warn('⚠️ Deepgram audio activity detection failed:', error);
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