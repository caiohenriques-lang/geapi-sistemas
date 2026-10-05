import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, AlertCircle } from 'lucide-react';

interface DateInputBRProps {
  id: string;
  label: string;
  value: string; // Formato interno ISO: YYYY-MM-DD
  onChange: (isoValue: string, isValid: boolean) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  placeholder?: string;
  className?: string;
}

/**
 * Verifica se o ano é bissexto
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Retorna o número de dias no mês/ano informado
 */
export function getDaysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  if ([4, 6, 9, 11].includes(month)) {
    return 30;
  }
  return 31;
}

/**
 * Valida a data no formato DD/MM/AAAA e converte para YYYY-MM-DD (ISO)
 */
export function parseAndValidateBRDate(str: string): {
  isValid: boolean;
  iso: string;
  errorMsg?: string;
} {
  if (!str || !str.trim()) {
    return { isValid: true, iso: '' };
  }

  const trimmed = str.trim();
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return {
      isValid: false,
      iso: '',
      errorMsg: 'Informe uma data válida no formato DD/MM/AAAA.',
    };
  }

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (year < 1900 || year > 2100) {
    return {
      isValid: false,
      iso: '',
      errorMsg: 'Ano deve estar entre 1900 e 2100.',
    };
  }

  if (month < 1 || month > 12) {
    return {
      isValid: false,
      iso: '',
      errorMsg: 'Mês inválido (deve estar entre 01 e 12).',
    };
  }

  const maxDays = getDaysInMonth(year, month);
  if (day < 1 || day > maxDays) {
    return {
      isValid: false,
      iso: '',
      errorMsg: `Dia inválido para ${String(month).padStart(2, '0')}/${year} (máximo ${maxDays} dias).`,
    };
  }

  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { isValid: true, iso };
}

/**
 * Converte data em ISO (YYYY-MM-DD) para formato visual DD/MM/AAAA
 */
export function isoToBRDate(isoStr: string): string {
  if (!isoStr) return '';
  const match = String(isoStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  // Se já for DD/MM/AAAA
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(isoStr)) {
    return isoStr;
  }
  return isoStr;
}

/**
 * Aplica máscara de digitação amigável DD/MM/AAAA
 */
export function applyDateMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export const DateInputBR: React.FC<DateInputBRProps> = ({
  id,
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  error,
  helperText,
  placeholder = 'DD/MM/AAAA',
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState<string>(() => isoToBRDate(value));
  const [localError, setLocalError] = useState<string | null>(null);
  const hiddenDateRef = useRef<HTMLInputElement | null>(null);

  // Sincroniza estado de exibição sempre que a prop value (ISO) for alterada externamente
  useEffect(() => {
    const formatted = isoToBRDate(value);
    setDisplayValue(formatted);
    if (!formatted) {
      setLocalError(null);
    }
  }, [value]);

  // Manipula digitação manual do usuário
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const typed = e.target.value;
    const masked = applyDateMask(typed);
    setDisplayValue(masked);

    if (masked.length === 0) {
      setLocalError(null);
      onChange('', true);
      return;
    }

    if (masked.length === 10) {
      const validation = parseAndValidateBRDate(masked);
      if (validation.isValid) {
        setLocalError(null);
        onChange(validation.iso, true);
      } else {
        const err = validation.errorMsg || 'Data inválida no formato DD/MM/AAAA.';
        setLocalError(err);
        onChange('', false);
      }
    } else {
      // Data incompleta sendo digitada
      setLocalError(null);
      onChange('', false);
    }
  };

  // Manipula quando o campo perde o foco (blur validation)
  const handleBlur = () => {
    if (displayValue && displayValue.length > 0 && displayValue.length < 10) {
      setLocalError('Informe a data completa no formato DD/MM/AAAA.');
      onChange('', false);
    }
  };

  // Manipula seleção via seletor de calendário nativo
  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoPicked = e.target.value; // Formato YYYY-MM-DD
    if (isoPicked) {
      const brFormatted = isoToBRDate(isoPicked);
      setDisplayValue(brFormatted);
      setLocalError(null);
      onChange(isoPicked, true);
    }
  };

  // Aciona o seletor nativo de data do navegador
  const handleOpenPicker = () => {
    if (disabled) return;
    if (hiddenDateRef.current) {
      try {
        if (typeof hiddenDateRef.current.showPicker === 'function') {
          hiddenDateRef.current.showPicker();
        } else {
          hiddenDateRef.current.click();
        }
      } catch {
        hiddenDateRef.current.click();
      }
    }
  };

  const activeError = error || localError;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label
        htmlFor={id}
        className="block text-xs font-bold uppercase tracking-wider text-slate-700"
      >
        {label} {required && <span className="text-red-500 font-bold">*</span>}
      </label>

      <div className="relative flex items-center">
        {/* Campo de Texto para Digitação Manual (DD/MM/AAAA) */}
        <input
          id={id}
          type="text"
          value={displayValue}
          onChange={handleTextChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={10}
          inputMode="numeric"
          autoComplete="off"
          className={`w-full pl-3.5 pr-10 py-2.5 bg-white text-slate-900 font-medium text-sm rounded-lg border shadow-2xs transition-all outline-none ${
            activeError
              ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/20'
              : 'border-slate-300 focus:border-slate-600 focus:ring-2 focus:ring-slate-100'
          } ${disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
        />

        {/* Botão para Abertura do Calendário Nativo */}
        <button
          type="button"
          onClick={handleOpenPicker}
          disabled={disabled}
          tabIndex={-1}
          className="absolute right-2.5 p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          title="Abrir calendário para seleção de data"
        >
          <CalendarIcon className="w-4 h-4" />
        </button>

        {/* Input Oculto de Data Nativo (para disparar o Picker) */}
        <input
          ref={hiddenDateRef}
          type="date"
          value={value || ''}
          onChange={handlePickerChange}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only pointer-events-none absolute opacity-0 w-0 h-0"
        />
      </div>

      {/* Mensagem de Erro / Dica */}
      {activeError ? (
        <p className="text-xs font-semibold text-rose-600 flex items-center gap-1 mt-1">
          <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          <span>{activeError}</span>
        </p>
      ) : helperText ? (
        <p className="text-xs text-slate-500 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
};
