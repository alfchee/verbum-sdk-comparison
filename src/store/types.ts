import { Action, Computed } from 'easy-peasy';
import { TranscriptionResult, TranscriptionMetrics } from '@/types';

// Deepgram store module interface
export interface DeepgramModel {
  // State
  text: string;
  results: TranscriptionResult[];
  metrics: TranscriptionMetrics;
  isActive: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  
  // Computed
  finalText: Computed<DeepgramModel, string>;
  averageLatency: Computed<DeepgramModel, number>;
  totalWords: Computed<DeepgramModel, number>;
  isConnected: Computed<DeepgramModel, boolean>;
  
  // Actions
  addResult: Action<DeepgramModel, TranscriptionResult>;
  updateText: Action<DeepgramModel, string>;
  updateMetrics: Action<DeepgramModel, TranscriptionMetrics>;
  setActive: Action<DeepgramModel, boolean>;
  setConnectionStatus: Action<DeepgramModel, 'disconnected' | 'connecting' | 'connected' | 'error'>;
  clearResults: Action<DeepgramModel>;
  reset: Action<DeepgramModel>;
}

// Verbum store module interface
export interface VerbumModel {
  // State
  text: string;
  results: TranscriptionResult[];
  metrics: TranscriptionMetrics;
  isActive: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  
  // Computed
  finalText: Computed<VerbumModel, string>;
  averageLatency: Computed<VerbumModel, number>;
  totalWords: Computed<VerbumModel, number>;
  isConnected: Computed<VerbumModel, boolean>;
  
  // Actions
  addResult: Action<VerbumModel, TranscriptionResult>;
  updateText: Action<VerbumModel, string>;
  updateMetrics: Action<VerbumModel, TranscriptionMetrics>;
  setActive: Action<VerbumModel, boolean>;
  setConnectionStatus: Action<VerbumModel, 'disconnected' | 'connecting' | 'connected' | 'error'>;
  clearResults: Action<VerbumModel>;
  reset: Action<VerbumModel>;
}

// Main store model interface
export interface StoreModel {
  deepgram: DeepgramModel;
  verbum: VerbumModel;
}