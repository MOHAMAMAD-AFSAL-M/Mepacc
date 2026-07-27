import { useState, useRef, useEffect } from 'react';

/**
 * PinInput — 6 individual digit cells for PIN entry.
 *
 * Matches the MEPac Figma design: 6 separate rounded cells in a row,
 * each accepting a single digit. Focus auto-advances on input.
 *
 * Props:
 *   length    – number of digits (default 6)
 *   value     – current PIN string
 *   onChange  – callback with updated PIN string
 *   error     – boolean, applies error border styling
 *   disabled  – boolean
 *   autoFocus – focus first cell on mount
 */
export default function PinInput({
  length = 6,
  value = '',
  onChange,
  error = false,
  disabled = false,
  autoFocus = false,
}) {
  const inputRefs = useRef([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const digits = value.split('').concat(Array(length).fill('')).slice(0, length);

  const handleChange = (index, e) => {
    let char = e.target.value;
    
    // If a user types a new char in an already filled cell, take the newly typed char (the last one)
    if (char.length > 1) {
      char = char.slice(-1);
    }

    // Only allow single digit
    if (char && !/^\d$/.test(char)) return;

    const newDigits = [...digits];
    newDigits[index] = char;
    const newPin = newDigits.join('');
    onChange(newPin);

    // Auto-advance to next cell
    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // If current cell is empty, go back and clear previous
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current cell
        const newDigits = [...digits];
        newDigits[index] = '';
        onChange(newDigits.join(''));
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted) {
      onChange(pasted);
      // Focus the cell after the last pasted digit
      const focusIdx = Math.min(pasted.length, length - 1);
      inputRefs.current[focusIdx]?.focus();
    }
  };

  return (
    <div className="flex items-center justify-between gap-2">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={digit}
          disabled={disabled}
          autoComplete="off"
          data-1p-ignore="true"
          data-lpignore="true"
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={index === 0 ? handlePaste : undefined}
          onFocus={(e) => {
            setFocusedIndex(index);
            e.target.select();
          }}
          onBlur={() => setFocusedIndex(-1)}
          aria-label={`PIN digit ${index + 1}`}
          className={[
            'w-10 h-10 p-0 text-center text-base font-semibold rounded-sm',
            'border bg-surface-card text-text-primary caret-primary',
            'transition-colors duration-fast',
            'focus:outline-none focus:ring-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error
              ? 'border-error focus:ring-error/30 focus:border-error'
              : focusedIndex === index
                ? 'border-primary ring-2 ring-primary/30'
                : 'border-border-strong',
          ].join(' ')}
        />
      ))}
    </div>
  );
}
