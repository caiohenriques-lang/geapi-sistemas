import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';

export interface AutocompleteFieldOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface AutocompleteFieldProps {
  id: string;
  label: string;
  value: string;
  options: AutocompleteFieldOption[] | string[];
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  helpText?: string;
  error?: string;
  uppercase?: boolean;
}

export const AutocompleteField: React.FC<AutocompleteFieldProps> = ({
  id,
  label,
  value,
  options,
  onChange,
  placeholder = 'Selecione ou digite para pesquisar...',
  required = false,
  disabled = false,
  helpText,
  error,
  uppercase = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Normaliza lista de opções
  const normalizedOptions: AutocompleteFieldOption[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  // Sincroniza searchTerm quando o valor externo muda
  useEffect(() => {
    const selected = normalizedOptions.find((o) => o.value === value);
    if (selected) {
      setSearchTerm(selected.label);
    } else {
      setSearchTerm(value || '');
    }
  }, [value, options]);

  // Fecha ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // Restaura label do valor atual se o usuário digitou algo sem selecionar
        const selected = normalizedOptions.find((o) => o.value === value);
        if (selected) {
          setSearchTerm(selected.label);
        } else if (!value) {
          setSearchTerm('');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, normalizedOptions]);

  // Filtro por "CONTÉM" (case-insensitive)
  const filteredOptions = normalizedOptions.filter((opt) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase();
    const labelMatch = opt.label.toLowerCase().includes(term);
    const sublabelMatch = opt.sublabel?.toLowerCase().includes(term);
    return labelMatch || sublabelMatch;
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    setIsOpen(true);
    setHighlightedIndex(0);

    // Se o texto bater exatamente com uma opção, já atualiza o valor
    const exact = normalizedOptions.find(
      (o) => o.label.trim().toLowerCase() === val.trim().toLowerCase()
    );
    if (exact) {
      onChange(exact.value);
    } else if (value) {
      onChange('');
    }
  };

  const handleSelect = (option: AutocompleteFieldOption) => {
    setSearchTerm(option.label);
    onChange(option.value);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchTerm('');
    onChange('');
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
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
      const selected = normalizedOptions.find((o) => o.value === value);
      if (selected) setSearchTerm(selected.label);
    }
  };

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
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          className={`w-full pl-9 pr-16 py-2.5 bg-white text-slate-900 font-medium text-sm rounded-lg border shadow-2xs transition-all outline-none ${
            uppercase ? 'uppercase placeholder:normal-case' : ''
          } placeholder:text-slate-400 cursor-pointer ${
            error
              ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/20'
              : 'border-slate-300 focus:border-slate-600 focus:ring-2 focus:ring-slate-100'
          } ${disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : ''}`}
        />

        <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-0.5">
          {searchTerm && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              tabIndex={-1}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              title="Limpar campo"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={handleToggle}
            tabIndex={-1}
            disabled={disabled}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            title={isOpen ? 'Fechar opções' : 'Abrir opções'}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-slate-700' : ''
              }`}
            />
          </button>
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
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1.5 left-0 right-0 w-full max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-sm text-slate-800"
        >
          {filteredOptions.length === 0 ? (
            <li className="px-4 py-3.5 text-xs text-slate-500 text-center font-medium">
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
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`px-3.5 py-2.5 cursor-pointer flex items-center justify-between transition-colors border-b border-slate-50 last:border-b-0 ${
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
                  {isSelected && (
                    <Check className="w-4 h-4 text-slate-800 shrink-0 ml-2" />
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
};
