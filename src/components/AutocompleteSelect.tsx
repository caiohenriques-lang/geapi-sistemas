import React, { useState, useRef, useEffect, useId } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';

export interface AutocompleteOption {
  value: string;
  label: string;
  sublabel?: string;
  originalData?: any;
}

interface AutocompleteSelectProps {
  id: string;
  label: string;
  options: AutocompleteOption[];
  value: string;
  onChange: (value: string, selectedOption?: AutocompleteOption) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  helpText?: string;
  isInitialEmptyPending?: boolean;
}

export const AutocompleteSelect: React.FC<AutocompleteSelectProps> = ({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = 'DIGITE PARA FILTRAR...',
  required = false,
  error,
  disabled = false,
  helpText,
  isInitialEmptyPending = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const listboxId = useId();

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync value label to search input when not actively editing
  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (selectedOption) {
      setSearchTerm(selectedOption.label);
    } else {
      setSearchTerm(value || '');
    }
  }, [value, options]);

  // Filter options based on user input
  const filteredOptions = options.filter((opt) => {
    const term = searchTerm.trim().toUpperCase();
    if (!term) return true;
    return (
      opt.label.toUpperCase().includes(term) ||
      (opt.sublabel && opt.sublabel.toUpperCase().includes(term)) ||
      opt.value.toUpperCase().includes(term)
    );
  });

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        // If search term doesn't match selected value, reset to current value or clear
        const match = options.find(
          (opt) => opt.label.toUpperCase() === searchTerm.trim().toUpperCase()
        );
        if (match) {
          setSearchTerm(match.label);
          onChange(match.value, match);
        } else if (selectedOption) {
          setSearchTerm(selectedOption.label);
        } else {
          setSearchTerm('');
          onChange('');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption, searchTerm, options, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const upperVal = e.target.value.toUpperCase();
    setSearchTerm(upperVal);
    setIsOpen(true);
    setHighlightedIndex(0);

    // If typing matches an exact option, auto select it, otherwise clear until chosen
    const exactMatch = options.find((opt) => opt.label.toUpperCase() === upperVal.trim());
    if (exactMatch) {
      onChange(exactMatch.value, exactMatch);
    } else if (selectedOption && selectedOption.label !== upperVal) {
      onChange('');
    }
  };

  const handleSelect = (option: AutocompleteOption) => {
    setSearchTerm(option.label);
    onChange(option.value, option);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchTerm('');
    onChange('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen) {
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
      }
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
        e.preventDefault();
        handleSelect(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Tab') {
      if (isOpen) {
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        setIsOpen(false);
      }
    }
  };

  const isPendingState = isInitialEmptyPending && !value && !disabled;

  return (
    <div ref={containerRef} className="relative w-full">
      <label
        htmlFor={id}
        className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
      >
        {label} {required && <span className="text-red-500 font-bold">*</span>}
      </label>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>

        <input
          ref={inputRef}
          id={id}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-invalid={!!error}
          className={`w-full pl-9 pr-10 py-2.5 bg-white text-slate-900 font-medium text-sm rounded-lg border shadow-2xs transition-all outline-none uppercase placeholder:normal-case placeholder:text-slate-400 ${
            error
              ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/20'
              : isPendingState
              ? 'border-rose-300 bg-rose-50/15 focus:border-slate-600 focus:ring-2 focus:ring-slate-100'
              : 'border-slate-300 focus:border-slate-600 focus:ring-2 focus:ring-slate-100'
          } ${disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : ''}`}
        />

        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1">
          {searchTerm && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              tabIndex={-1}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
              title="Limpar seleção"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 pointer-events-none ${
              isOpen ? 'rotate-180 text-slate-700' : ''
            }`}
          />
        </div>
      </div>

      {helpText && !error && (
        <p className="mt-1 text-xs text-slate-500">{helpText}</p>
      )}

      {error && (
        <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1">
          <span>&bull;</span> {error}
        </p>
      )}

      {isOpen && !disabled && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-40 mt-1 w-full max-h-60 overflow-auto bg-white border border-slate-200 rounded-lg shadow-lg py-1 text-sm text-slate-800"
        >
          {filteredOptions.length === 0 ? (
            <li className="px-4 py-3 text-xs text-slate-500 text-center font-medium">
              Nenhum resultado encontrado para "{searchTerm}"
            </li>
          ) : (
            filteredOptions.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isHighlighted = idx === highlightedIndex;

              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(opt);
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleSelect(opt);
                  }}
                  onClick={() => handleSelect(opt)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`px-3.5 py-2.5 cursor-pointer flex items-center justify-between transition-colors ${
                    isHighlighted
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'hover:bg-slate-50'
                  } ${isSelected ? 'bg-slate-100 text-slate-900 font-bold' : ''}`}
                >
                  <div className="flex flex-col">
                    <span className="text-xs uppercase font-medium tracking-tight">
                      {opt.label}
                    </span>
                    {opt.sublabel && (
                      <span className="text-[11px] text-slate-500 font-mono normal-case">
                        {opt.sublabel}
                      </span>
                    )}
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-slate-800 shrink-0" />}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
};
