'use client';

import { useStoreState } from '@/store/hooks';

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
  data?: BenchmarkData;
  useStore?: boolean;
}

export function BenchmarkVisualization({ data, useStore = false }: BenchmarkVisualizationProps) {
  // Optionally read from store
  const storeDeepgramMetrics = useStoreState(state => state.deepgram.metrics);
  const storeVerbumMetrics = useStoreState(state => state.verbum.metrics);
  
  // Use store data if useStore is true, otherwise use props
  const benchmarkData = useStore ? {
    deepgram: {
      accuracy: storeDeepgramMetrics.accuracy || 94.2,
      latency: storeDeepgramMetrics.latency || 180,
    },
    verbum: {
      accuracy: storeVerbumMetrics.accuracy || 97.8,
      latency: storeVerbumMetrics.latency || 95,
    },
  } : (data || {
    deepgram: { accuracy: 94.2, latency: 180 },
    verbum: { accuracy: 97.8, latency: 95 },
  });
  const maxAccuracy = Math.max(benchmarkData.deepgram.accuracy, benchmarkData.verbum.accuracy);
  const maxLatency = Math.max(benchmarkData.deepgram.latency, benchmarkData.verbum.latency);

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
                style={{ height: `${(benchmarkData.deepgram.accuracy / maxAccuracy) * 100}%` }}
              ></div>
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-gray-400 text-sm text-center">
                Deepgram<br />({benchmarkData.deepgram.accuracy.toFixed(1)}%)
              </span>
            </div>
            <div className="relative w-24">
              <div 
                className="bg-purple-600 w-full rounded-t-lg transition-all duration-1000"
                style={{ height: `${(benchmarkData.verbum.accuracy / maxAccuracy) * 100}%` }}
              ></div>
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-gray-400 text-sm text-center">
                Verbum<br />({benchmarkData.verbum.accuracy.toFixed(1)}%)
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
                style={{ height: `${(benchmarkData.deepgram.latency / maxLatency) * 100}%` }}
              ></div>
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-gray-400 text-sm text-center">
                Deepgram<br />({benchmarkData.deepgram.latency}ms)
              </span>
            </div>
            <div className="relative w-24">
              <div 
                className="bg-purple-600 w-full rounded-t-lg transition-all duration-1000"
                style={{ height: `${(benchmarkData.verbum.latency / maxLatency) * 100}%` }}
              ></div>
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-gray-400 text-sm text-center">
                Verbum<br />({benchmarkData.verbum.latency}ms)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}