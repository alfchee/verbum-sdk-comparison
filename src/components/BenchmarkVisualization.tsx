'use client';

interface BenchmarkData {
  deepgram: {
    accuracy: number;
    latency: number;
  };
  verbum: {
    accuracy: number;
    latency: number;
  };
}

interface BenchmarkVisualizationProps {
  data: BenchmarkData;
}

export function BenchmarkVisualization({ data }: BenchmarkVisualizationProps) {
  const maxAccuracy = Math.max(data.deepgram.accuracy, data.verbum.accuracy);
  const maxLatency = Math.max(data.deepgram.latency, data.verbum.latency);

  return (
    <div className="mb-20">
      <h2 className="text-2xl font-semibold mb-8 text-center">Real-time Benchmarks</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-8">
        {/* Accuracy Chart */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-400 text-center">Accuracy</h3>
          <div className="flex justify-center items-end h-48 space-x-8">
            <div className="relative w-24">
              <div 
                className="bg-blue-600 w-full rounded-t-lg transition-all duration-1000"
                style={{ height: `${(data.deepgram.accuracy / maxAccuracy) * 100}%` }}
              ></div>
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-gray-400 text-sm text-center">
                Deepgram<br />({data.deepgram.accuracy.toFixed(1)}%)
              </span>
            </div>
            <div className="relative w-24">
              <div 
                className="bg-purple-600 w-full rounded-t-lg transition-all duration-1000"
                style={{ height: `${(data.verbum.accuracy / maxAccuracy) * 100}%` }}
              ></div>
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-gray-400 text-sm text-center">
                Verbum<br />({data.verbum.accuracy.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Latency Chart */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-400 text-center">Latency (ms)</h3>
          <div className="flex justify-center items-end h-48 space-x-8">
            <div className="relative w-24">
              <div 
                className="bg-blue-600 w-full rounded-t-lg transition-all duration-1000"
                style={{ height: `${(data.deepgram.latency / maxLatency) * 100}%` }}
              ></div>
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-gray-400 text-sm text-center">
                Deepgram<br />({data.deepgram.latency}ms)
              </span>
            </div>
            <div className="relative w-24">
              <div 
                className="bg-purple-600 w-full rounded-t-lg transition-all duration-1000"
                style={{ height: `${(data.verbum.latency / maxLatency) * 100}%` }}
              ></div>
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-gray-400 text-sm text-center">
                Verbum<br />({data.verbum.latency}ms)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}