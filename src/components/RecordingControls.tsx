'use client';

import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/outline';

interface RecordingControlsProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  disabled?: boolean;
}

export function RecordingControls({ 
  isRecording, 
  onStartRecording, 
  onStopRecording, 
  disabled = false 
}: RecordingControlsProps) {
  const handleClick = () => {
    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        flex items-center px-6 py-3 rounded-full font-semibold transition-all duration-200
        ${isRecording 
          ? 'bg-red-600 hover:bg-red-700 text-white' 
          : 'bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {isRecording ? (
        <>
          <StopIcon className="h-5 w-5 mr-2" />
          Stop Recording
        </>
      ) : (
        <>
          <MicrophoneIcon className="h-5 w-5 mr-2 text-red-500" />
          Start Recording
        </>
      )}
    </button>
  );
}