import { useId, type ComponentProps, type ReactNode } from 'react';

interface TextFieldProps extends ComponentProps<'input'> {
  label: string;
  /** Validation message shown under the field and linked to it for screen readers. */
  error?: string;
  /** Optional element placed inside the input on the right (e.g. a show/hide button). */
  endAdornment?: ReactNode;
}

export function TextField({
  label,
  error,
  endAdornment,
  className = '',
  ...inputProps
}: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 ${
            error ? 'border-red-500' : 'border-slate-300'
          } ${endAdornment ? 'pr-11' : ''} ${className}`}
          {...inputProps}
        />
        {endAdornment && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-1.5">{endAdornment}</div>
        )}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
