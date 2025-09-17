'use client';

import { useStoreState } from '@/store/hooks';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

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
  const deepgramResults = useStoreState(state => state.deepgram.results);
  const verbumResults = useStoreState(state => state.verbum.results);
  
  // Check if we have actual data (not just initial state)
  const hasDeepgramData = deepgramResults.length > 0;
  const hasVerbumData = verbumResults.length > 0;
  
  // Use store data if useStore is true, otherwise use props
  const benchmarkData = useStore ? {
    deepgram: {
      accuracy: hasDeepgramData ? storeDeepgramMetrics.accuracy : 0,
      latency: hasDeepgramData ? storeDeepgramMetrics.latency : 0,
    },
    verbum: {
      accuracy: hasVerbumData ? storeVerbumMetrics.accuracy : 0,
      latency: hasVerbumData ? storeVerbumMetrics.latency : 0,
    },
  } : (data || {
    deepgram: { accuracy: 0, latency: 0 },
    verbum: { accuracy: 0, latency: 0 },
  });
  // Remove unused variables - Chart.js handles scaling automatically
  
  // Show if we have any actual measurements
  const hasAnyData = hasDeepgramData || hasVerbumData;

  // Chart.js configuration for Accuracy
  const accuracyChartData = {
    labels: ['Deepgram', 'Verbum'],
    datasets: [
      {
        label: 'Accuracy (%)',
        data: [benchmarkData.deepgram.accuracy, benchmarkData.verbum.accuracy],
        backgroundColor: [
          hasDeepgramData ? 'rgba(37, 99, 235, 0.8)' : 'rgba(107, 114, 128, 0.5)', // blue-600 vs gray-500
          hasVerbumData ? 'rgba(147, 51, 234, 0.8)' : 'rgba(107, 114, 128, 0.5)', // purple-600 vs gray-500
        ],
        borderColor: [
          hasDeepgramData ? 'rgba(37, 99, 235, 1)' : 'rgba(107, 114, 128, 0.8)',
          hasVerbumData ? 'rgba(147, 51, 234, 1)' : 'rgba(107, 114, 128, 0.8)',
        ],
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  // Chart.js configuration for Latency
  const latencyChartData = {
    labels: ['Deepgram', 'Verbum'],
    datasets: [
      {
        label: 'Latency (ms)',
        data: [benchmarkData.deepgram.latency, benchmarkData.verbum.latency],
        backgroundColor: [
          hasDeepgramData ? 'rgba(37, 99, 235, 0.8)' : 'rgba(107, 114, 128, 0.5)',
          hasVerbumData ? 'rgba(147, 51, 234, 0.8)' : 'rgba(107, 114, 128, 0.5)',
        ],
        borderColor: [
          hasDeepgramData ? 'rgba(37, 99, 235, 1)' : 'rgba(107, 114, 128, 0.8)',
          hasVerbumData ? 'rgba(147, 51, 234, 1)' : 'rgba(107, 114, 128, 0.8)',
        ],
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Hide legend since we have clear labels
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)', // gray-900
        titleColor: 'rgba(243, 244, 246, 1)', // gray-100
        bodyColor: 'rgba(243, 244, 246, 1)', // gray-100
        borderColor: 'rgba(75, 85, 99, 1)', // gray-600
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(75, 85, 99, 0.3)', // gray-600 with opacity
        },
        ticks: {
          color: 'rgba(156, 163, 175, 1)', // gray-400
          font: {
            size: 12,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(75, 85, 99, 0.3)', // gray-600 with opacity
        },
        ticks: {
          color: 'rgba(156, 163, 175, 1)', // gray-400
          font: {
            size: 12,
          },
        },
      },
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart' as const,
    },
  };

  // Accuracy-specific options
  const accuracyOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        max: 100, // Accuracy is percentage (0-100%)
        ticks: {
          ...chartOptions.scales.y.ticks,
          callback: function(value: string | number) {
            return value + '%';
          },
        },
      },
    },
  };

  // Latency-specific options
  const latencyOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        ticks: {
          ...chartOptions.scales.y.ticks,
          callback: function(value: string | number) {
            return value + 'ms';
          },
        },
      },
    },
  };

  return (
    <div className="mb-20">
      <h2 className="text-2xl font-semibold mb-8 text-center">Real-time Benchmarks</h2>
      {!hasAnyData && (
        <div className="text-center text-gray-400 mb-4">
          <p>📊 Start recording to see real-time metrics</p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-8">
        {/* Accuracy Chart */}
        <div className="relative">
          <h3 className="text-lg font-semibold mb-4 text-gray-400 text-center">Accuracy</h3>
          <div className="h-72 bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
            <Bar data={accuracyChartData} options={accuracyOptions} />
          </div>
          {!hasAnyData && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-gray-500 text-sm">No data available</span>
            </div>
          )}
        </div>

        {/* Latency Chart */}
        <div className="relative">
          <h3 className="text-lg font-semibold mb-4 text-gray-400 text-center">Latency (ms)</h3>
          <div className="h-72 bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
            <Bar data={latencyChartData} options={latencyOptions} />
          </div>
          {!hasAnyData && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-gray-500 text-sm">No data available</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}