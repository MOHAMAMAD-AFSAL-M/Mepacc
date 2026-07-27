import { forwardRef } from 'react';

/**
 * Input — shared labeled text input primitive.
 *
 * Renders an uppercase label above a bordered input field,
 * matching the "FIRST NAME" / "MOBILE" field style.
 *
 * Props:
 *   label, id, error (optional error message), className, ...rest
 */
const Input = forwardRef(function Input(
  { label, id, error, className = '', ...rest },
  ref,
) {
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={[
          'w-full px-3 py-2.5 text-sm rounded-sm border bg-surface-card',
          'text-text-primary placeholder:text-text-muted font-sans',
          'transition-colors duration-fast',
          'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
          error
            ? 'border-error focus:ring-error/30 focus:border-error'
            : 'border-border',
        ].join(' ')}
        {...rest}
      />
      {error && (
        <p className="mt-1 text-xs text-error">{error}</p>
      )}
    </div>
  );
});

export default Input;
