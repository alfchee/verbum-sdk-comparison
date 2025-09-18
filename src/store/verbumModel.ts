import { action, computed } from 'easy-peasy';
import { VerbumModel } from './types';

export const verbumModel: VerbumModel = {
  // Initial State
  text: '',
  results: [],
  translationText: '',
  translationResults: [],
  metrics: {
    latency: 0,
    accuracy: 0,
    wordCount: 0,
  },
  isActive: false,
  connectionStatus: 'disconnected',

  // Computed Values
  finalText: computed((state) => {
    return state.results
      .filter(result => result.isFinal)
      .map(result => result.text)
      .join(' ')
      .trim();
  }),

  averageLatency: computed((state) => {
    // Return the current metrics latency
    return state.metrics.latency || 0;
  }),

  totalWords: computed((state) => {
    return state.finalText.split(/\s+/).filter(word => word.length > 0).length;
  }),

  finalTranslationText: computed((state) => {
    return state.translationResults
      .filter(result => result.isFinal)
      .map(result => result.translation || '')
      .join(' ')
      .trim();
  }),

  isConnected: computed((state) => {
    return state.connectionStatus === 'connected';
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

  addTranslationResult: action((state, payload) => {
    state.translationResults.push(payload);

    // Update translation text based on result type
    if (payload.isFinal) {
      // For final results, append to existing translation text
      const finalTranslationText = state.translationResults
        .filter(result => result.isFinal)
        .map(result => result.translation || '')
        .join(' ')
        .trim();
      state.translationText = finalTranslationText;
    } else {
      // For interim results, show them temporarily
      const finalTranslations = state.translationResults
        .filter(result => result.isFinal)
        .map(result => result.translation || '');
      state.translationText = finalTranslations.length > 0
        ? `${finalTranslations.join(' ')} ${payload.translation || ''}`.trim()
        : (payload.translation || '');
    }
  }),

  clearResults: action((state) => {
    console.log('🧹 Clearing Verbum results and text');
    state.results = [];
    state.text = '';
    state.translationResults = [];
    state.translationText = '';
  }),

  reset: action((state) => {
    console.log('🔄 Resetting Verbum store to initial state');
    state.text = '';
    state.results = [];
    state.translationText = '';
    state.translationResults = [];
    state.metrics = {
      latency: 0,
      accuracy: 0,
      wordCount: 0,
    };
    state.isActive = false;
    state.connectionStatus = 'disconnected';
  }),
};