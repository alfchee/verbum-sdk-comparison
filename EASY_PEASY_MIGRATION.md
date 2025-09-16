# Easy-Peasy Store Migration Guide

## Overview

The application has been successfully migrated from React's local state (`useState`) to **easy-peasy** for centralized state management. The store is organized into two separate modules: **Deepgram** and **Verbum**, each managing their own transcription data, metrics, and connection states.

## Store Architecture

### 📁 Store Structure
```
src/store/
├── index.ts          # Main store creation and exports
├── types.ts          # TypeScript interfaces for store models
├── hooks.ts          # Typed hooks for easy-peasy
├── StoreProvider.tsx # React provider component
├── deepgramModel.ts  # Deepgram module definition
└── verbumModel.ts    # Verbum module definition
```

### 🏪 Store Modules

#### Deepgram Module (`deepgramModel.ts`)
**State:**
- `text`: Current transcription text
- `results`: Array of TranscriptionResult objects
- `metrics`: Performance metrics (latency, accuracy, wordCount)
- `isActive`: Whether the service is currently active

**Computed Values:**
- `finalText`: Only final/completed transcription text
- `averageLatency`: Calculated average latency from metrics
- `totalWords`: Word count from final text

**Actions:**
- `addResult(result)`: Add new transcription result
- `updateText(text)`: Update current text display
- `updateMetrics(metrics)`: Update performance metrics
- `setActive(active)`: Set service active state
- `clearResults()`: Clear all results and text
- `reset()`: Reset module to initial state

#### Verbum Module (`verbumModel.ts`)
**State:** (Same as Deepgram, plus:)
- `connectionStatus`: WebSocket connection state ('disconnected' | 'connecting' | 'connected' | 'error')

**Computed Values:** (Same as Deepgram, plus:)
- `isConnected`: Boolean indicating if connected

**Actions:** (Same as Deepgram, plus:)
- `setConnectionStatus(status)`: Update connection status

## Migration Changes

### Before (Local State)
```typescript
// Old approach with useState
const [deepgramText, setDeepgramText] = useState('');
const [verbumText, setVerbumText] = useState('');
const [deepgramMetrics, setDeepgramMetrics] = useState({ latency: 0, accuracy: 0 });
const [verbumMetrics, setVerbumMetrics] = useState({ latency: 0, accuracy: 0 });

// Update states manually
setDeepgramText(newText);
setDeepgramMetrics({ latency: 120, accuracy: 95.5 });
```

### After (Easy-Peasy Store)
```typescript
// New approach with easy-peasy
const deepgramText = useStoreState(state => state.deepgram.text);
const verbumText = useStoreState(state => state.verbum.text);
const deepgramMetrics = useStoreState(state => state.deepgram.metrics);
const verbumMetrics = useStoreState(state => state.verbum.metrics);

const deepgramActions = useStoreActions(actions => actions.deepgram);
const verbumActions = useStoreActions(actions => actions.verbum);

// Update through actions
deepgramActions.updateText(newText);
deepgramActions.updateMetrics({ latency: 120, accuracy: 95.5 });
```

## Component Updates

### 📄 page.tsx
- ✅ Replaced all `useState` calls with `useStoreState` and `useStoreActions`
- ✅ Updated service initialization to use store actions
- ✅ Replaced manual state updates with action dispatches
- ✅ Added connection status tracking for Verbum service

### 📊 BenchmarkVisualization.tsx
- ✅ Added optional `useStore` prop to read metrics from store
- ✅ Maintains backward compatibility with prop-based data
- ✅ Dynamically displays real-time metrics from both services

### 🎯 TranscriptionCard.tsx
- ✅ No changes needed - continues to receive data via props
- ✅ Maintains clean separation of concerns
- ✅ Flexible and reusable component design

## Usage Examples

### Reading State
```typescript
// Get current transcription text
const verbumText = useStoreState(state => state.verbum.text);

// Get connection status
const isConnected = useStoreState(state => state.verbum.isConnected);

// Get metrics
const accuracy = useStoreState(state => state.deepgram.metrics.accuracy);
```

### Dispatching Actions
```typescript
const verbumActions = useStoreActions(actions => actions.verbum);

// Add a new transcription result
verbumActions.addResult({
  text: "Hello world",
  timestamp: Date.now(),
  confidence: 0.95,
  isFinal: true
});

// Update metrics
verbumActions.updateMetrics({
  latency: 85,
  accuracy: 98.2,
  wordCount: 150
});

// Reset everything
verbumActions.reset();
```

## Benefits of Easy-Peasy Integration

### 🎯 **Separation of Concerns**
- Deepgram and Verbum data are completely isolated
- Each module manages its own state and logic
- No cross-contamination between services

### 🔄 **Reactive Updates**
- Components automatically re-render when store state changes
- Real-time updates without manual state synchronization
- Computed values automatically recalculate

### 🧪 **Better Testing**
- Store logic is separated from UI components
- Actions can be unit tested independently
- Predictable state mutations

### 📈 **Performance**
- Only components using specific store slices re-render
- Efficient computed value caching
- Optimized state updates

### 🔧 **Developer Experience**
- Full TypeScript support with typed hooks
- Clear action-based state mutations
- Centralized state management

## Store Provider Setup

The `StoreProvider` is configured in `src/app/layout.tsx` to wrap the entire application:

```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
```

## Real-time Integration

### Verbum Service Integration
```typescript
// When starting Verbum transcription
verbumActions.setActive(true);
verbumActions.setConnectionStatus('connecting');

// On successful connection
verbumActions.setConnectionStatus('connected');

// On receiving transcription results
verbumActions.addResult(result);
```

### Mock Deepgram Integration
```typescript
// Simulate real-time Deepgram transcription
const mockResult: TranscriptionResult = {
  text: nextWord,
  timestamp: Date.now(),
  confidence: 0.95,
  isFinal: true
};

deepgramActions.addResult(mockResult);
deepgramActions.updateMetrics({ latency, accuracy, wordCount });
```

## Testing the Store

To verify the store is working correctly:

1. **Start Recording**: Both modules should show `isActive: true`
2. **Check Real-time Updates**: Text should appear in both TranscriptionCard components
3. **Monitor Metrics**: Benchmark visualization should update with live data
4. **Stop Recording**: Services should become inactive and final metrics calculated
5. **Connection Status**: Verbum should show proper WebSocket connection states

## Future Enhancements

The store architecture supports easy addition of:
- 🔍 **Search/Filter functionality** across transcription history
- 💾 **Persistence** to localStorage or external APIs
- 📊 **Advanced analytics** and performance tracking
- 🔄 **Undo/Redo capabilities** for transcription editing
- 🌐 **Multi-language support** with language-specific stores

The easy-peasy store provides a solid foundation for scaling the application with additional features and services.