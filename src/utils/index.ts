import { Language } from '@/types';

/**
 * Supported languages for STT comparison
 */
export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
  { code: 'es-ES', name: 'Spanish', flag: '🇪🇸' },
  { code: 'de-DE', name: 'German', flag: '🇩🇪' },
  { code: 'it-IT', name: 'Italian', flag: '🇮🇹' },
  { code: 'fr-FR', name: 'French', flag: '🇫🇷' },
  { code: 'zh-CN', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja-JP', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko-KR', name: 'Korean', flag: '🇰🇷' },
  { code: 'ru-RU', name: 'Russian', flag: '🇷🇺' },
];

/**
 * Maps language codes between different STT services
 */
export const mapLanguageCode = (code: string, service: 'deepgram' | 'verbum' | 'webspeech'): string => {
  const mapping: { [key: string]: { [key: string]: string } } = {
    'en-US': { deepgram: 'en-US', verbum: 'en-US', webspeech: 'en-US' },
    'es-ES': { deepgram: 'es', verbum: 'es-ES', webspeech: 'es-ES' },
    'de-DE': { deepgram: 'de', verbum: 'de-DE', webspeech: 'de-DE' },
    'it-IT': { deepgram: 'it', verbum: 'it-IT', webspeech: 'it-IT' },
    'fr-FR': { deepgram: 'fr', verbum: 'fr-FR', webspeech: 'fr-FR' },
    'zh-CN': { deepgram: 'zh', verbum: 'zh-CN', webspeech: 'zh-CN' },
    'ja-JP': { deepgram: 'ja', verbum: 'ja-JP', webspeech: 'ja-JP' },
    'ko-KR': { deepgram: 'ko', verbum: 'ko-KR', webspeech: 'ko-KR' },
    'ru-RU': { deepgram: 'ru', verbum: 'ru-RU', webspeech: 'ru-RU' },
  };
  
  return mapping[code]?.[service] || mapping['en-US'][service];
};

/**
 * Formats a timestamp to a readable time string
 */
export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

/**
 * Calculates the average of an array of numbers
 */
export const calculateAverage = (numbers: number[]): number => {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
};

/**
 * Debounce function to limit the rate of function calls
 */
export const debounce = <T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Checks if the browser supports Web Speech API
 */
export const isWebSpeechSupported = (): boolean => {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
};

/**
 * Checks if the browser supports getUserMedia (microphone access)
 */
export const isMicrophoneSupported = (): boolean => {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
};

/**
 * Generates a random confidence score for demonstration purposes
 */
export const generateMockConfidence = (): number => {
  return Math.random() * 0.3 + 0.7; // Returns a value between 0.7 and 1.0
};

/**
 * Generates mock latency values for demonstration
 */
export const generateMockLatency = (baseLatency: number = 100): number => {
  return baseLatency + Math.random() * 50; // Add up to 50ms of random variation
};

/**
 * Word count utility
 */
export const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

/**
 * Truncates text to a specified length
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Error handling utility for STT services
 */
export const handleSTTError = (error: unknown, serviceName: string): string => {
  console.error(`${serviceName} error:`, error);
  
  if (error instanceof Error) {
    switch (error.message) {
      case 'not-allowed':
      case 'NotAllowedError':
        return 'Microphone access denied. Please allow microphone permissions and try again.';
      case 'not-found':
      case 'NotFoundError':
        return 'No microphone found. Please check your audio devices.';
      case 'abort':
      case 'AbortError':
        return 'Recording was aborted.';
      case 'network':
        return `${serviceName} network error. Please check your internet connection.`;
      default:
        return `${serviceName} error: ${error.message}`;
    }
  }
  
  return `An unknown error occurred with ${serviceName}.`;
};