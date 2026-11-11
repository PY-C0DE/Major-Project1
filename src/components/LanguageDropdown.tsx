/**
 * AlphaQuant AI - Language Selector Dropdown
 * Compact, modern, and accessible language picker for the navigation bar.
 * Supports quick selection across 8 major languages with native script labels.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage, SUPPORTED_LANGUAGES, LanguageCode } from '../context/LanguageContext';

interface LanguageDropdownProps {
  compact?: boolean;
}

export const LanguageDropdown: React.FC<LanguageDropdownProps> = ({ compact = false }) => {
  const { language, setLanguage, currentLanguageMeta, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectLanguage = (code: LanguageCode) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        title={t('nav.select_language', 'Select Language')}
        aria-label={t('nav.select_language', 'Select Language')}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border transition-colors cursor-pointer text-xs font-medium shrink-0 ${
          isOpen
            ? 'bg-slate-200 dark:bg-slate-800 border-cyan-500/50 text-slate-900 dark:text-white shadow-xs'
            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
        }`}
      >
        <span className="text-sm leading-none shrink-0" aria-hidden="true">
          {currentLanguageMeta.flag}
        </span>
        {!compact && (
          <span className="font-sans font-semibold hidden md:inline truncate max-w-[70px]">
            {currentLanguageMeta.nativeName}
          </span>
        )}
        <span className="font-mono text-[10px] uppercase text-slate-500 dark:text-slate-400 font-bold hidden sm:inline md:hidden">
          {currentLanguageMeta.code}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-cyan-600 dark:text-cyan-400' : ''
          }`}
        />
      </button>

      {/* Floating Language Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label={t('nav.select_language', 'Select Language')}
          className="absolute right-0 top-full mt-1.5 w-56 sm:w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl py-1.5 z-50 animate-fadeIn transition-all text-xs"
        >
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan-500" />
              {t('nav.language', 'Language')}
            </span>
            <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold">
              {SUPPORTED_LANGUAGES.length} {t('nav.select_language', 'Available')}
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto py-1 divide-y divide-slate-100/50 dark:divide-slate-800/40">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = lang.code === language;
              return (
                <button
                  key={lang.code}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`w-full px-3 py-2 flex items-center justify-between text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-200 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base shrink-0" aria-hidden="true">
                      {lang.flag}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate leading-tight">
                        {lang.nativeName}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                        {lang.name}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="text-cyan-600 dark:text-cyan-400 shrink-0 ml-2">
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
export default LanguageDropdown;
