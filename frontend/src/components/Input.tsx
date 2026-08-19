import * as React from 'react';
import { cn, useId } from '../lib/utils';

const fieldBaseClass =
  'block w-full rounded-[var(--nx-radius-sm)] border bg-surface px-3 text-sm text-ink placeholder:text-ink-muted/70 ' +
  'transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-surface ' +
  'disabled:bg-canvas disabled:text-ink-muted disabled:cursor-not-allowed';

/**
 * FormField — layout wrapper shared by every input type: label, optional
 * required marker, help text, and error message, wired together with
 * aria-describedby so the association is programmatic, not just visual.
 *
 * Compose it around any control:
 *   <FormField label="GSTIN" error={errors.gstin} help="15-character GST ID">
 *     <TextField {...} />
 *   </FormField>
 */
export interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  help?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, htmlFor, required, error, help, children, className }: FormFieldProps) {
  const helpId = help ? `${htmlFor}-help` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
        {required && (
          <>
            <span className="ml-0.5 text-danger" aria-hidden="true">*</span>
            <span className="sr-only"> required</span>
          </>
        )}
      </label>
      {/* Cloning lets the wrapper own aria wiring without every input
          re-implementing it — describedby covers both help and error
          since only one is ever visible at a time. */}
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<any>, {
            id: htmlFor,
            'aria-invalid': !!error || undefined,
            'aria-describedby': cn(helpId, errorId) || undefined,
          })
        : children}
      {help && !error && (
        <p id={helpId} className="text-xs text-ink-muted">
          {help}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  leftAddon?: React.ReactNode;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ className, invalid, leftAddon, ...props }, ref) => {
    if (leftAddon) {
      return (
        <div
          className={cn(
            'flex items-center rounded-[var(--nx-radius-sm)] border bg-surface focus-within:ring-2 focus-within:ring-primary',
            props['aria-invalid'] || invalid ? 'border-danger' : 'border-border-strong'
          )}
        >
          <span className="pl-3 text-sm text-ink-muted" aria-hidden="true">
            {leftAddon}
          </span>
          <input
            ref={ref}
            className={cn(fieldBaseClass, 'h-10 border-0 pl-1.5 focus:ring-0', className)}
            {...props}
          />
        </div>
      );
    }
    return (
      <input
        ref={ref}
        className={cn(
          fieldBaseClass,
          'h-10',
          props['aria-invalid'] || invalid ? 'border-danger' : 'border-border-strong',
          className
        )}
        {...props}
      />
    );
  }
);
TextField.displayName = 'TextField';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        fieldBaseClass,
        'min-h-[96px] py-2',
        props['aria-invalid'] || invalid ? 'border-danger' : 'border-border-strong',
        className
      )}
      {...props}
    />
  )
);
TextArea.displayName = 'TextArea';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  placeholder?: string;
  invalid?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, placeholder, className, invalid, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        fieldBaseClass,
        'h-10 appearance-none bg-[url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="%235B6472"><path d="M5.5 7.5l4.5 4.5 4.5-4.5"/></svg>\')] bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-9',
        props['aria-invalid'] || invalid ? 'border-danger' : 'border-border-strong',
        className
      )}
      {...props}
    >
      {placeholder && (
        <option value="" disabled hidden>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
);
Select.displayName = 'Select';

/** Convenience hook for generating a stable input id when composing FormField ad hoc. */
export function useFieldId(prefix?: string) {
  return React.useMemo(() => useId(prefix), [prefix]);
}
