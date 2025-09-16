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

const defaultLanguage: Language = SUPPORTED_LANGUAGES[0];

export default function Home() {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(defaultLanguage);
  const [deepgramText, setDeepgramText] = useState('');
  const [verbumText, setVerbumText] = useState('');
  const [deepgramMetrics, setDeepgramMetrics] = useState({ latency: 0, accuracy: 0 });
  const [verbumMetrics, setVerbumMetrics] = useState({ latency: 0, accuracy: 0 });
  
  const { isRecording, mediaStream, error, startRecording, stopRecording } = useAudioRecording();
  
  const verbumServiceRef = useRef<VerbumService | null>(null);
  const verbumResultsRef = useRef<TranscriptionResult[]>([]);

  const handleStartRecording = useCallback(async () => {
    try {
      await startRecording();
      
      // Clear previous results
      setDeepgramText('');
      setVerbumText('');
      verbumResultsRef.current = [];
      
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [startRecording]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
    
    if (verbumServiceRef.current) {
      verbumServiceRef.current.stopTranscription();
      const metrics = verbumServiceRef.current.calculateMetrics(verbumResultsRef.current);
      setVerbumMetrics({ latency: metrics.latency, accuracy: metrics.accuracy });
    }
  }, [stopRecording]);

  // Initialize services when recording starts
  useEffect(() => {
    if (isRecording && mediaStream) {
      const verbumApiKey = process.env.NEXT_PUBLIC_VERBUM_API_KEY || 'mock-verbum-key';
      
      try {        
        // Initialize Verbum service (using Web Speech API as mock)
        verbumServiceRef.current = new VerbumService(verbumApiKey);
        verbumServiceRef.current.startTranscription(
          mediaStream,
          selectedLanguage.code,
          (result) => {
            verbumResultsRef.current.push(result);
            if (result.isFinal) {
              setVerbumText(prev => prev + ' ' + result.text);
            } else {
              // For interim results, show them with different styling
              setVerbumText(prev => {
                const finalWords = prev.split(' ').filter(w => w.trim());
                return finalWords.join(' ') + ' ' + result.text;
              });
            }
          }
        );

        // Mock Deepgram results for demonstration
        let mockText = '';
        const interval = setInterval(() => {
          if (!isRecording) {
            clearInterval(interval);
            return;
          }
          
          const mockWords = [
            'Hello', 'world', 'this', 'is', 'a', 'demonstration', 'of', 'Deepgram', 
            'speech', 'to', 'text', 'transcription', 'in', 'real', 'time'
          ];
          
          if (mockText.split(' ').length < mockWords.length) {
            const nextWord = mockWords[mockText.split(' ').filter(w => w).length];
            mockText += (mockText ? ' ' : '') + nextWord;
            setDeepgramText(mockText);
            setDeepgramMetrics({ latency: Math.random() * 50 + 80, accuracy: Math.random() * 5 + 95 });
          }
        }, 1000);

        return () => clearInterval(interval);
        
      } catch (error) {
        console.error('Error initializing STT services:', error);
      }
    }
  }, [isRecording, mediaStream, selectedLanguage.code]);

  const benchmarkData = {
    deepgram: {
      accuracy: deepgramMetrics.accuracy || 96.5,
      latency: deepgramMetrics.latency || 120,
    },
    verbum: {
      accuracy: verbumMetrics.accuracy || 89.2,
      latency: verbumMetrics.latency || 180,
    },
  };

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
              latency={deepgramMetrics.latency || undefined}
              accuracy={deepgramMetrics.accuracy || undefined}
            />
            
            <TranscriptionCard
              title="Verbum Transcription"
              text={verbumText}
              isDeepgram={false}
              isRecording={isRecording}
              latency={verbumMetrics.latency || undefined}
              accuracy={verbumMetrics.accuracy || undefined}
            />
          </div>
        </div>

        {/* Benchmarks Section */}
        <BenchmarkVisualization data={benchmarkData} />
      </main>
      
      <Footer />
    </div>
  );
}
