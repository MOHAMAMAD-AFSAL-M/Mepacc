/**
 * Card — shared container primitive.
 *
 * A rounded, padded wrapper for grouped content (profile summary,
 * attendance calendar, job detail sections, etc.).
 *
 * Props:
 *   children, className, padding ('default' | 'none'), ...rest
 */
export default function Card({
  children,
  className = '',
  padding = 'default',
  ...rest
}) {
  return (
    <div
      className={[
        'bg-surface-card rounded-md border border-border shadow-card',
        padding === 'default' ? 'p-card-p' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
