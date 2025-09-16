'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { LanguageSelector } from '@/components/LanguageSelector';
import { Language, TranscriptionResult } from '@/types';
import { SUPPORTED_LANGUAGES } from '@/utils';
import { RecordingControls } from '@/components/RecordingControls';
import { TranscriptionCard } from '@/components/TranscriptionCard';
import { BenchmarkVisualization } from '@/components/BenchmarkVisualization';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { VerbumService } from '@/services/verbumService';
import { DeepgramService } from '@/services/deepgramService';
import { useStoreState, useStoreActions } from '@/store/hooks';
import { store } from '@/store/index';

const defaultLanguage: Language = SUPPORTED_LANGUAGES[0];

export default function Home() {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(defaultLanguage);
  
  // Store state
  const deepgramText = useStoreState(state => state.deepgram.text);
  const verbumText = useStoreState(state => state.verbum.text);
  const deepgramMetrics = useStoreState(state => state.deepgram.metrics);
  const verbumMetrics = useStoreState(state => state.verbum.metrics);
  
  // Debug logging for metrics
  console.log('📊 Current metrics - Deepgram:', deepgramMetrics, 'Verbum:', verbumMetrics);
  
  // Store actions
  const deepgramActions = useStoreActions(actions => actions.deepgram);
  const verbumActions = useStoreActions(actions => actions.verbum);
  
  const { isRecording, mediaStream, error, startRecording, stopRecording } = useAudioRecording();
  
  const verbumServiceRef = useRef<VerbumService | null>(null);
  const deepgramServiceRef = useRef<DeepgramService | null>(null);
  const verbumResultsRef = useRef<TranscriptionResult[]>([]);

  const handleStartRecording = useCallback(async () => {
    try {
      console.log('🎙️ Starting new recording session - resetting all data');
      
      // FIRST: Reset all store data before starting recording
      deepgramActions.reset();
      verbumActions.reset();
      verbumResultsRef.current = [];
      
      // THEN: Start the recording
      await startRecording();
      
      console.log('✅ Recording started with fresh state');
      
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
    }
  }, [startRecording, deepgramActions, verbumActions]);

  const handleStopRecording = useCallback(async () => {
    stopRecording();
    
    // Update store state to inactive
    deepgramActions.setActive(false);
    verbumActions.setActive(false);
    
    // Stop Deepgram service
    if (deepgramServiceRef.current) {
      await deepgramServiceRef.current.stopTranscription();
      deepgramServiceRef.current = null;
    }
    
    // Stop Verbum service
    if (verbumServiceRef.current) {
      verbumServiceRef.current.stopTranscription();
      // Don't override metrics here - VerbumService already calculates them internally
      
      // Clear the service reference to prevent reuse
      verbumServiceRef.current = null;
    }
  }, [stopRecording, deepgramActions, verbumActions]);

  // Initialize services when recording starts
  useEffect(() => {
    if (isRecording && mediaStream) {
      const verbumApiKey = process.env.NEXT_PUBLIC_VERBUM_API_KEY || 'mock-verbum-key';
      const deepgramApiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY || 'mock-deepgram-key';
      
      try {        
        console.log('🚀 Initializing real STT services for fresh recording session');
        
        // Initialize Deepgram service
        if (!deepgramServiceRef.current) {
          console.log('🔗 Creating new Deepgram service connection');
          deepgramActions.setActive(true);
          deepgramActions.setConnectionStatus('connecting');
          
          deepgramServiceRef.current = new DeepgramService(deepgramApiKey, store);
          deepgramServiceRef.current.startTranscription(mediaStream, selectedLanguage.code);
        }
        
        // Initialize Verbum service only if not already active
        if (!verbumServiceRef.current) {
          console.log('🔗 Creating new Verbum service connection');
          verbumActions.setActive(true);
          verbumActions.setConnectionStatus('connecting');
          
          verbumServiceRef.current = new VerbumService(verbumApiKey, store);
          verbumServiceRef.current.startTranscription(mediaStream, selectedLanguage.code);
        }
        
      } catch (error) {
        console.error('Error initializing STT services:', error);
        deepgramActions.setConnectionStatus('error');
        verbumActions.setConnectionStatus('error');
      }
    }
    
    // Cleanup when recording stops
    return () => {
      if (!isRecording) {
        if (deepgramServiceRef.current) {
          deepgramServiceRef.current.stopTranscription();
          deepgramServiceRef.current = null;
          deepgramActions.setConnectionStatus('disconnected');
        }
        
        if (verbumServiceRef.current) {
          verbumServiceRef.current.stopTranscription();
          verbumServiceRef.current = null;
          verbumActions.setConnectionStatus('disconnected');
        }
      }
    };
  }, [isRecording, mediaStream, selectedLanguage.code, deepgramActions, verbumActions]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />
      
      <main className="container mx-auto px-4 mt-16 text-center">
        {/* Hero Section */}
        <div className="mb-20">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Real-time Speech-to-Text: <br className="md:hidden" />
            Deepgram vs. Verbum
          </h1>
          <p className="mt-4 text-gray-400">Unbiased Benchmarking for Developers</p>
          <button className="mt-8 px-8 py-3 rounded-full font-bold text-lg gradient-button">
            Start Comparing Now
          </button>
        </div>

        {/* Live Transcription Section */}
        <div className="mb-20">
          <h2 className="text-2xl font-semibold mb-8">Live Transcription</h2>
          
          {/* Language Selector and Recording Controls */}
          <div className="flex items-center justify-center space-x-4 mb-8 text-gray-400">
            <LanguageSelector
              selectedLanguage={selectedLanguage}
              onLanguageChange={setSelectedLanguage}
            />
            <RecordingControls
              isRecording={isRecording}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
            />
            {/* Manual Reset Button for Testing */}
            <button
              onClick={() => {
                console.log('🧹 Manual reset triggered');
                deepgramActions.reset();
                verbumActions.reset();
                verbumResultsRef.current = [];
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
              title="Clear all transcriptions and start fresh"
            >
              🔄 Reset
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-900/20 border border-red-600 rounded-lg text-red-400">
              {error}
            </div>
          )}

          {/* Transcription Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <TranscriptionCard
              title="Deepgram Transcription"
              text={deepgramText}
              isDeepgram={true}
              isRecording={isRecording}
              latency={deepgramMetrics.latency !== 0 ? deepgramMetrics.latency : undefined}
              accuracy={deepgramMetrics.accuracy !== 0 ? deepgramMetrics.accuracy : undefined}
            />
            
            <TranscriptionCard
              title="Verbum Transcription"
              text={verbumText}
              isDeepgram={false}
              isRecording={isRecording}
              latency={verbumMetrics.latency !== 0 ? verbumMetrics.latency : undefined}
              accuracy={verbumMetrics.accuracy !== 0 ? verbumMetrics.accuracy : undefined}
            />
          </div>
        </div>

        {/* Benchmarks Section */}
        <BenchmarkVisualization useStore={true} />
      </main>
      
      <Footer />
    </div>
  );
}
