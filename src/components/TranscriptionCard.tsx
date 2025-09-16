'use client';

interface TranscriptionCardProps {
  title: string;
  text: string;
  isDeepgram?: boolean;
  isRecording: boolean;
  latency?: number;
  accuracy?: number;
}

export function TranscriptionCard({ 
  title, 
  text, 
  isDeepgram = false, 
  isRecording, 
  latency, 
  accuracy 
}: TranscriptionCardProps) {
  const cardClass = isDeepgram 
    ? "border-indigo-400 deepgram-card" 
    : "border-fuchsia-500 verbum-card";
  
  const titleClass = isDeepgram 
    ? "text-indigo-400" 
    : "text-fuchsia-500";

  return (
    <div className={`p-6 rounded-lg border-2 ${cardClass}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-xl font-bold ${titleClass}`}>{title}</h3>
        {isRecording && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-400">Recording</span>
          </div>
        )}
      </div>
      
      <div className="min-h-[120px] mb-4">
        <p className="text-gray-300 leading-relaxed">
          {text || (isRecording ? "Listening..." : "Click 'Start Recording' to begin transcription")}
        </p>
      </div>

      {/* Performance metrics */}
      {(latency !== undefined || accuracy !== undefined) && (
        <div className="flex justify-between text-sm text-gray-400 border-t border-gray-700 pt-4">
          {latency !== undefined && (
            <div>
              <span className="text-gray-500">Latency:</span>
              <span className="ml-1 font-semibold">{latency}ms</span>
            </div>
          )}
          {accuracy !== undefined && (
            <div>
              <span className="text-gray-500">Accuracy:</span>
              <span className="ml-1 font-semibold">{accuracy.toFixed(1)}%</span>
            </div>
          )}
        </div>
      )}

      {/* Audio visualization placeholder */}
      <div className="mt-6">
        <div className="w-full h-16 bg-gray-800 rounded flex items-center justify-center">
          {isRecording ? (
            <div className="flex items-center space-x-1">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full ${isDeepgram ? 'bg-indigo-400' : 'bg-fuchsia-500'}`}
                  style={{
                    height: `${Math.random() * 40 + 8}px`,
                    animation: `pulse ${Math.random() * 0.5 + 0.5}s ease-in-out infinite alternate`
                  }}
                />
              ))}
            </div>
          ) : (
            <span className="text-gray-500 text-sm">Audio Waveform</span>
          )}
        </div>
      </div>
    </div>
  );
}