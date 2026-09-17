import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Loader2, AlertCircle, Check, Map } from 'lucide-react';
import { fetchMapReferences, MapReferenceItem } from '../services/mapReferenceService';

interface MapAutocompleteProps {
  value: MapReferenceItem | null;
  onChange: (item: MapReferenceItem | null) => void;
  disabled?: boolean;
}

export const MapAutocomplete: React.FC<MapAutocompleteProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [items, setItems] = useState<MapReferenceItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [query, setQuery] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load items from public sheet CSV on mount
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);

    fetchMapReferences()
      .then((data) => {
        if (isMounted) {
          setItems(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Falha ao carregar lista de referências:', err);
          setLoadError('Não foi possível carregar a lista de locais da planilha pública.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Update query when selected value changes
  useEffect(() => {
    if (value) {
      setQuery(`${value.codigo} - ${value.endereco}`);
    } else {
      setQuery('');
    }
  }, [value]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter items based on query
  const filteredItems = items.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    // Match code (Column D), address (Column K/G), corridor or neighborhood
    return (
      item.codigo.toLowerCase().includes(q) ||
      item.endereco.toLowerCase().includes(q) ||
      (item.bairro && item.bairro.toLowerCase().includes(q)) ||
      (item.corredor && item.corredor.toLowerCase().includes(q))
    );
  }).slice(0, 50); // Limit to top 50 results for optimal performance

  const handleSelect = (item: MapReferenceItem) => {
    onChange(item);
    setQuery(`${item.codigo} - ${item.endereco}`);
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
    setIsOpen(false);
    setFocusedIndex(-1);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < filteredItems.length) {
        handleSelect(filteredItems[focusedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setFocusedIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full space-y-1.5">
      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
        BUSCAR UM EQUIPAMENTO DE FISCALIZAÇÃO ELETRÔNICA?
      </label>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
          ) : (
            <Search className="w-4 h-4 text-slate-400" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled || isLoading}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setFocusedIndex(-1);
            if (value && e.target.value !== `${value.codigo} - ${value.endereco}`) {
              onChange(null);
            }
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={
            isLoading
              ? 'Carregando lista de referências...'
              : 'Pesquisar equipamento ou código de referência...'
          }
          className={`w-full pl-9 pr-9 py-2.5 text-xs font-medium bg-white rounded-lg border transition-all ${
            loadError
              ? 'border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
              : 'border-slate-300 focus:border-rose-600 focus:ring-1 focus:ring-rose-600'
          } ${disabled || isLoading ? 'bg-slate-50 cursor-not-allowed opacity-75' : ''}`}
        />

        {query && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            title="Limpar seleção"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Helper info text */}
      <p className="text-[11px] text-slate-500">
        Selecione um item da lista para gerar automaticamente o mapa de localização.
      </p>

      {/* Load error warning */}
      {loadError && (
        <div className="text-xs text-rose-600 font-medium flex items-center gap-1.5 p-2 bg-rose-50 rounded border border-rose-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* Dropdown list */}
      {isOpen && !disabled && !isLoading && (
        <div className="absolute z-40 mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-200 max-h-64 overflow-y-auto py-1 animate-fadeIn">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-3 text-xs text-slate-500 text-center">
              Nenhum local encontrado para "{query}".
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = value?.codigo === item.codigo;
              const isFocused = index === focusedIndex;

              return (
                <button
                  key={`${item.codigo}_${index}`}
                  type="button"
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setFocusedIndex(index)}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between gap-2 border-b border-slate-100 last:border-b-0 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-rose-50 text-rose-900 font-bold'
                      : isFocused
                      ? 'bg-slate-100 text-slate-900'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`p-1 rounded shrink-0 mt-0.5 ${
                        item.isValidCoord
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : 'bg-amber-50 text-amber-600 border border-amber-200'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 font-mono">
                          {item.codigo}
                        </span>
                        {item.bairro && (
                          <span className="text-[10px] text-slate-500 font-normal px-1.5 py-0.2 bg-slate-100 rounded border border-slate-200">
                            {item.bairro}
                          </span>
                        )}
                        {!item.isValidCoord && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                            Sem Coordenadas
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-600 truncate mt-0.5">
                        {item.endereco || 'Endereço não cadastrado'}
                      </div>
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-rose-600 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
