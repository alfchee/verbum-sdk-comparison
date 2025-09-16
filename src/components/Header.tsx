import { MicrophoneIcon } from '@heroicons/react/24/outline';

export function Header() {
  return (
    <header className="container mx-auto px-4 py-6">
      <nav className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <MicrophoneIcon className="h-6 w-6 text-indigo-400" />
          <span className="text-xl font-bold">STT Compare</span>
        </div>
        <div className="space-x-8 text-gray-400 font-medium">
          <a href="#" className="hover:text-white transition-colors">Home</a>
          <a href="#" className="hover:text-white transition-colors">Compare</a>
          <a href="#" className="hover:text-white transition-colors">Benchmarks</a>
          <a href="#" className="hover:text-white transition-colors">About ▼</a>
        </div>
      </nav>
    </header>
  );
}