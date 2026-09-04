import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Select — Custom dropdown primitive matching the Foreman Proxy Reasons popup design.
 * Features:
 *   - Custom trigger button with border-border-strong & rotating ChevronDown icon
 *   - Floating popup window (shadow-lg, max-h-60 with smooth scroll)
 *   - Active option highlight with Check icon
 *   - Automatic click-outside dismissal
 *   - 100% compatible with standard React event handlers: onChange({ target: { value } })
 */
export default function Select({
  value,
  onChange,
  options = [],
  className = '',
  placeholder = 'Select...',
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelectOption = (optValue) => {
    if (onChange) {
      onChange({ target: { value: optValue } });
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={[
          'w-full flex items-center justify-between bg-surface-card border border-border-strong',
          'text-text-primary text-sm rounded-md px-3 py-2 hover:border-primary',
          'transition-colors duration-fast focus:outline-none focus:ring-2 focus:ring-primary/30',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-text-muted transition-transform duration-200 shrink-0 ml-2 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Custom Popup Menu */}
      {isOpen && (
        <div className="absolute z-40 w-full mt-1 bg-surface-card rounded-md shadow-lg border border-border max-h-60 overflow-y-auto animate-fade-in">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelectOption(opt.value)}
                className={[
                  'w-full text-left px-3.5 py-2.5 text-sm flex items-center justify-between',
                  'transition-colors duration-fast border-b border-border/40 last:border-none',
                  isSelected
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-text-primary hover:bg-surface-container-low',
                ].join(' ')}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={14} className="text-primary shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
