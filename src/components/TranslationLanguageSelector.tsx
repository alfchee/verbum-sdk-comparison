'use client';

import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

import { Language } from '@/types';
import { SUPPORTED_LANGUAGES } from '@/utils';

interface TranslationLanguageSelectorProps {
  selectedLanguage: Language | null;
  onLanguageChange: (language: Language | null) => void;
  disabled?: boolean;
}

export function TranslationLanguageSelector({
  selectedLanguage,
  onLanguageChange,
  disabled = false
}: TranslationLanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageSelect = (language: Language | null) => {
    onLanguageChange(language);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center px-3 py-2 border border-gray-700 rounded-full cursor-pointer transition-colors ${
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:border-gray-600'
        }`}
      >
        {selectedLanguage ? (
          <>
            <span className="mr-2">{selectedLanguage.flag}</span>
            <span className="text-sm">{selectedLanguage.name}</span>
          </>
        ) : (
          <span className="text-sm text-gray-400">No Translation</span>
        )}
        <ChevronDownIcon className="h-4 w-4 ml-2" />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
          <button
            onClick={() => handleLanguageSelect(null)}
            className="w-full flex items-center px-4 py-2 hover:bg-gray-700 first:rounded-t-lg transition-colors"
          >
            <span className="text-sm text-gray-400">No Translation</span>
          </button>
          {SUPPORTED_LANGUAGES.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageSelect(language)}
              className="w-full flex items-center px-4 py-2 hover:bg-gray-700 last:rounded-b-lg transition-colors"
            >
              <span className="mr-2">{language.flag}</span>
              <span className="text-sm">{language.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}