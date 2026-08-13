import {
  forwardRef,
  useId,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Eye, EyeOff } from "lucide-react";
import clsx from "clsx";

interface FormFieldProps {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}

export function FormField({ label, helperText, error, required, children, htmlFor, className }: FormFieldProps) {
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-sm text-danger" role="alert" aria-live="polite">
          {error}
        </p>
      ) : helperText ? (
        <p className="text-sm text-ink-muted">{helperText}</p>
      ) : null}
    </div>
  );
}

const baseFieldClasses =
  "h-10 w-full rounded-lg border border-surface-border bg-white px-3.5 text-sm text-ink placeholder:text-ink-muted focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 disabled:bg-slate-50 disabled:text-ink-muted";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, error, ...props }, ref) => (
  <input ref={ref} className={clsx(baseFieldClasses, error && "border-danger", className)} {...props} />
));
Input.displayName = "Input";

export const PasswordInput = forwardRef<HTMLInputElement, InputProps>(({ className, error, ...props }, ref) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        ref={ref}
        type={visible ? "text" : "password"}
        className={clsx(baseFieldClasses, "pr-11", error && "border-danger", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Parolni yashirish" : "Parolni ko'rsatish"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";

export const PhoneInput = forwardRef<HTMLInputElement, InputProps>(({ className, error, onChange, ...props }, ref) => {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    let value = e.target.value;
    if (value.startsWith("+998")) value = value.slice(4);
    let digits = value.replace(/\D/g, "");
    if (digits.length > 9 && digits.startsWith("998")) digits = digits.slice(3);
    digits = digits.slice(0, 9);
    e.target.value = digits ? `+998${digits}` : "";
    onChange?.(e);
  }

  return (
    <input
      ref={ref}
      type="tel"
      placeholder="+998901234567"
      onChange={handleChange}
      className={clsx(baseFieldClasses, error && "border-danger", className)}
      {...props}
    />
  );
});
PhoneInput.displayName = "PhoneInput";

export interface CurrencyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: number | undefined;
  onValueChange: (value: number | undefined) => void;
  error?: boolean;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, error, value, onValueChange, ...props }, ref) => (
    <div className="relative">
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={value != null ? new Intl.NumberFormat("uz-UZ").format(value) : ""}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, "");
          onValueChange(digits ? Number(digits) : undefined);
        }}
        className={clsx(baseFieldClasses, "pr-14", error && "border-danger", className)}
        {...props}
      />
      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-muted">so'm</span>
    </div>
  )
);
CurrencyInput.displayName = "CurrencyInput";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }>(
  ({ className, error, ...props }, ref) => (
    <textarea
      ref={ref}
      className={clsx(
        "min-h-[140px] w-full rounded-lg border border-surface-border bg-white px-3.5 py-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20",
        error && "border-danger",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, error, options, ...props }, ref) => (
  <select ref={ref} className={clsx(baseFieldClasses, "pr-8", error && "border-danger", className)} {...props}>
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
));
Select.displayName = "Select";

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: string }>(
  ({ label, id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <div className="flex items-center gap-2">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          className="h-5 w-5 rounded border-surface-border text-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          {...props}
        />
        <label htmlFor={inputId} className="text-sm text-ink">
          {label}
        </label>
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";

export function RadioGroup<T extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" className="flex gap-4">
      {options.map((opt) => (
        <label key={opt.value} className="flex items-center gap-2 text-sm text-ink">
          <input
            type="radio"
            name={name}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="h-4 w-4 text-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
