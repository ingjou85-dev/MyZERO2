import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';

interface TimeInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  accentColor?: 'maint' | 'prod' | 'slate';
  placeholder?: string;
  label?: string;
  helperText?: string;
  onNowClick?: () => void;
}

export const TimeInput: React.FC<TimeInputProps> = ({
  id,
  value,
  onChange,
  required = false,
  accentColor = 'maint',
  placeholder = 'HH:MM (24h)',
  label,
  helperText,
  onNowClick
}) => {
  const [displayValue, setDisplayValue] = useState<string>(value || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const nativePickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayValue(value || '');
  }, [value]);

  const ringColor =
    accentColor === 'prod'
      ? 'focus:ring-prod-600 border-slate-300'
      : accentColor === 'maint'
      ? 'focus:ring-maint-600 border-slate-300'
      : 'focus:ring-slate-600 border-slate-300';

  const btnColor =
    accentColor === 'prod'
      ? 'text-prod-700 bg-prod-50 hover:bg-prod-100 border-prod-200'
      : accentColor === 'maint'
      ? 'text-maint-700 bg-maint-50 hover:bg-maint-100 border-maint-200'
      : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-200';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && displayValue.endsWith(':')) {
      e.preventDefault();
      const nextVal = displayValue.slice(0, -2);
      setDisplayValue(nextVal);
      if (nextVal.length === 5) onChange(nextVal);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    if (!inputVal) {
      setDisplayValue('');
      onChange('');
      return;
    }

    // Extraer únicamente los dígitos ingresados
    const digits = inputVal.replace(/\D/g, '').slice(0, 4);

    let formatted = '';
    if (digits.length === 0) {
      formatted = '';
    } else if (digits.length === 1) {
      formatted = digits;
    } else if (digits.length === 2) {
      let h = parseInt(digits, 10);
      if (h > 23) h = 23;
      formatted = `${String(h).padStart(2, '0')}:`;
    } else if (digits.length === 3) {
      let h = parseInt(digits.slice(0, 2), 10);
      if (h > 23) h = 23;
      let mDigit = parseInt(digits[2], 10);
      if (mDigit > 5) mDigit = 5;
      formatted = `${String(h).padStart(2, '0')}:${mDigit}`;
    } else if (digits.length === 4) {
      let h = parseInt(digits.slice(0, 2), 10);
      if (h > 23) h = 23;
      let m = parseInt(digits.slice(2, 4), 10);
      if (m > 59) m = 59;
      formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    setDisplayValue(formatted);
    if (formatted.length === 5) {
      onChange(formatted);
    }
  };

  const handleBlur = () => {
    if (!displayValue) return;
    const digits = displayValue.replace(/\D/g, '');
    if (digits.length === 4) {
      const h = Math.min(23, parseInt(digits.slice(0, 2), 10));
      const m = Math.min(59, parseInt(digits.slice(2, 4), 10));
      const valid = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      setDisplayValue(valid);
      onChange(valid);
    } else if (digits.length === 3) {
      const h = Math.min(23, parseInt(digits.slice(0, 1), 10));
      const m = Math.min(59, parseInt(digits.slice(1, 3), 10));
      const valid = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      setDisplayValue(valid);
      onChange(valid);
    } else if (digits.length === 1 || digits.length === 2) {
      const h = Math.min(23, parseInt(digits, 10));
      const valid = `${String(h).padStart(2, '0')}:00`;
      setDisplayValue(valid);
      onChange(valid);
    }
  };

  const handleFocusClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  };

  const handleNativePickerClick = () => {
    try {
      if (nativePickerRef.current) {
        if (typeof nativePickerRef.current.showPicker === 'function') {
          nativePickerRef.current.showPicker();
        } else {
          nativePickerRef.current.focus();
          nativePickerRef.current.click();
        }
      }
    } catch {
      handleFocusClick();
    }
  };

  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      setDisplayValue(val);
      onChange(val);
    }
  };

  const getNowString = (): string => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const handleNowButtonClick = () => {
    if (onNowClick) {
      onNowClick();
    } else {
      const current = getNowString();
      setDisplayValue(current);
      onChange(current);
    }
  };

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <div className="flex justify-between items-center">
          <label htmlFor={id} className="block text-xs font-bold text-slate-700 uppercase">
            {label}
          </label>
        </div>
      )}

      <div className="flex gap-2 items-center">
        {/* INPUT PRINCIPAL OPTIMIZADO PARA TECLADO NUMÉRICO */}
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]{2}:[0-9]{2}"
            id={id}
            value={displayValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={placeholder}
            maxLength={5}
            required={required}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className={`w-full border p-2.5 sm:p-3 pr-10 rounded-xl text-sm sm:text-base font-mono font-bold tracking-widest focus:ring-2 focus:outline-none bg-white shadow-xs ${ringColor}`}
          />

          {/* ICONO / BOTÓN DEL SELECTOR NATIVO */}
          <button
            type="button"
            onClick={handleNativePickerClick}
            title="Abrir selector de hora nativo"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <Clock className="w-4 h-4" />
          </button>

          {/* INPUT NATIVO OCULTO PARA ABRIR PICKER NATIVO SI SE DESEA */}
          <input
            ref={nativePickerRef}
            type="time"
            tabIndex={-1}
            value={displayValue.length === 5 ? displayValue : ''}
            onChange={handleNativeChange}
            className="sr-only"
            aria-hidden="true"
          />
        </div>

        {/* BOTÓN HORA ACTUAL */}
        <button
          type="button"
          onClick={handleNowButtonClick}
          title="Asignar hora actual del sistema"
          className={`font-bold px-3 py-2.5 sm:py-3 rounded-xl text-xs uppercase shrink-0 border shadow-xs transition cursor-pointer ${btnColor}`}
        >
          Hora Actual
        </button>
      </div>

      <div className="flex justify-between items-center text-[10px] text-slate-500 pt-0.5">
        <span>{helperText || 'Formato 24h (HH:MM). Digite los números directamente.'}</span>
        {displayValue && (
          <span className="font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
            {displayValue}
          </span>
        )}
      </div>
    </div>
  );
};
