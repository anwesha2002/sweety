import { LoaderCircle } from 'lucide-react';
import type { ComponentProps } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends ComponentProps<'button'> {
  variant?: Variant;
  /** Shows a spinner and disables the button, e.g. while a form is submitting. */
  isLoading?: boolean;
}

const VARIANT_STYLES: Record<Variant, string> = {
  primary: 'bg-emerald-700 text-white hover:bg-emerald-800 disabled:bg-emerald-700/50',
  secondary:
    'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:text-slate-400',
  danger: 'bg-red-700 text-white hover:bg-red-800 disabled:bg-red-700/50',
};

export function Button({
  variant = 'primary',
  isLoading = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${VARIANT_STYLES[variant]} ${className}`}
      {...rest}
    >
      {isLoading && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
