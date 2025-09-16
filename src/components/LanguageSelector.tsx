'use client';

import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

import { Language } from '@/types';
import { SUPPORTED_LANGUAGES } from '@/utils';

interface LanguageSelectorProps {
  selectedLanguage: Language;
  onLanguageChange: (language: Language) => void;
}

export function LanguageSelector({ selectedLanguage, onLanguageChange }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageSelect = (language: Language) => {
    onLanguageChange(language);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-4 py-2 border border-gray-700 rounded-full cursor-pointer hover:border-gray-600 transition-colors"
      >
        <span className="mr-2">{selectedLanguage.flag}</span>
        <span>{selectedLanguage.name}</span>
        <ChevronDownIcon className="h-4 w-4 ml-2" />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
          {SUPPORTED_LANGUAGES.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageSelect(language)}
              className="w-full flex items-center px-4 py-2 hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg transition-colors"
            >
              <span className="mr-2">{language.flag}</span>
              <span>{language.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}