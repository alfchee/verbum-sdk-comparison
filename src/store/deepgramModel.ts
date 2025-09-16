import { action, computed } from 'easy-peasy';
import { DeepgramModel } from './types';

export const deepgramModel: DeepgramModel = {
  // Initial State
  text: '',
  results: [],
  metrics: {
    latency: 0,
    accuracy: 0,
    wordCount: 0,
  },
  isActive: false,
  connectionStatus: 'disconnected',

  // Computed Values
  isConnected: computed((state) => {
    return state.connectionStatus === 'connected';
  }),
  finalText: computed((state) => {
    return state.results
      .filter(result => result.isFinal)
      .map(result => result.text)
      .join(' ')
      .trim();
  }),

  averageLatency: computed((state) => {
    // Return the current metrics latency, or calculate from state.metrics
    return state.metrics.latency || 0;
  }),

  totalWords: computed((state) => {
    return state.finalText.split(/\s+/).filter(word => word.length > 0).length;
  }),

  // Actions
  addResult: action((state, payload) => {
    state.results.push(payload);
    
    // Update text based on result type
    if (payload.isFinal) {
      // For final results, append to existing text
      const finalText = state.results
        .filter(result => result.isFinal)
        .map(result => result.text)
        .join(' ')
        .trim();
      state.text = finalText;
    } else {
      // For interim results, show them temporarily
      const finalWords = state.results
        .filter(result => result.isFinal)
        .map(result => result.text)
        .join(' ');
      state.text = finalWords ? `${finalWords} ${payload.text}` : payload.text;
    }
  }),

  updateText: action((state, payload) => {
    state.text = payload;
  }),

  updateMetrics: action((state, payload) => {
    state.metrics = { ...state.metrics, ...payload };
  }),

  setActive: action((state, payload) => {
    state.isActive = payload;
  }),

  setConnectionStatus: action((state, payload) => {
    state.connectionStatus = payload;
  }),

  clearResults: action((state) => {
    console.log('🧹 Clearing Deepgram results and text');
    state.results = [];
    state.text = '';
  }),

  reset: action((state) => {
    console.log('🔄 Resetting Deepgram store to initial state');
    state.text = '';
    state.results = [];
    state.metrics = {
      latency: 0,
      accuracy: 0,
      wordCount: 0,
    };
    state.isActive = false;
    state.connectionStatus = 'disconnected';
  }),
};