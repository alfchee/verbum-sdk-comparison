'use client';

import { useState, useCallback, useRef } from 'react';

interface UseAudioRecordingReturn {
  isRecording: boolean;
  mediaStream: MediaStream | null;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

export function useAudioRecording(): UseAudioRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      // Request microphone access with optimized settings for OPUS
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000, // Better quality for speech recognition
          channelCount: 1,
        },
      });

      setMediaStream(stream);
      setIsRecording(true);

      // Create MediaRecorder for potential future use
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      mediaRecorderRef.current = mediaRecorder;

    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Failed to access microphone. Please check your permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaStream) {
      // Stop all tracks
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    setIsRecording(false);
  }, [mediaStream]);

  return {
    isRecording,
    mediaStream,
    error,
    startRecording,
    stopRecording,
  };
}