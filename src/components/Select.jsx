import { ChevronDown } from 'lucide-react';

/**
 * Select — reusable dropdown primitive.
 * Matches the Figma design: white bg, border, 8px radius, custom chevron.
 *
 * Props:
 *   value, onChange, options (array of {label, value}), className, ...rest
 */
export default function Select({
  value,
  onChange,
  options = [],
  className = '',
  ...rest
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={onChange}
        className="w-full appearance-none bg-white border border-border-strong rounded-sm px-3 py-2 text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
        <ChevronDown size={16} strokeWidth={2} />
      </div>
    </div>
  );
}
