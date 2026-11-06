import { useId, type ComponentProps } from 'react';

interface SelectFieldProps extends ComponentProps<'select'> {
  label: string;
  /** Validation message shown under the field and linked to it for screen readers. */
  error?: string;
}

/** A labelled <select>, built like TextField. Pass the <option>s as children. */
export function SelectField({
  label,
  error,
  className = '',
  children,
  ...selectProps
}: SelectFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 ${
          error ? 'border-red-500' : 'border-slate-300'
        } ${className}`}
        {...selectProps}
      >
        {children}
      </select>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
