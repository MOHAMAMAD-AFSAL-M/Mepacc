import { forwardRef } from 'react';

/**
 * Button — shared button primitive.
 *
 * Variants:
 *   'primary'  – solid navy background, white text (main CTAs)
 *   'secondary' – bordered, transparent background
 *   'danger'   – text-only red for destructive actions (e.g. "Log Out")
 *
 * Sizes:
 *   'md' (default) – standard button
 *   'sm'           – compact button
 *   'lg'           – full-width / prominent button
 *
 * Props:
 *   variant, size, children, className, disabled, icon (optional Lucide component), ...rest
 */

const variants = {
  primary: [
    'bg-primary text-text-inverse',
    'hover:bg-primary-light',
    'active:bg-primary-dark',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' '),

  secondary: [
    'bg-transparent text-primary border border-primary',
    'hover:bg-primary hover:text-text-inverse',
    'active:bg-primary-dark active:text-text-inverse',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' '),

  danger: [
    'bg-transparent text-error',
    'hover:bg-error/10',
    'active:bg-error/20',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' '),
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-5 py-3 text-base gap-2 w-full',
};

const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    children,
    className = '',
    icon: Icon,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      className={[
        'inline-flex items-center justify-center font-medium rounded-sm',
        'transition-colors duration-fast',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        variants[variant],
        sizes[size],
        className,
      ].join(' ')}
      {...rest}
    >
      {Icon && <Icon size={size === 'sm' ? 16 : 18} strokeWidth={2} />}
      {children}
    </button>
  );
});

export default Button;
