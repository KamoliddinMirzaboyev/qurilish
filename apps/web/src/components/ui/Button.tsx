import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "outline" | "outlineOnDark" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary: "bg-brand-primary text-white hover:bg-brand-primaryHover",
  secondary: "bg-brand-dark text-white hover:bg-slate-800",
  outline: "border border-surface-border bg-white text-ink hover:bg-slate-50",
  outlineOnDark: "border border-white/30 bg-transparent text-white hover:bg-white/10",
  ghost: "text-ink hover:bg-slate-100",
  danger: "bg-danger text-white hover:bg-red-700",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-6 text-sm",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  asLink?: boolean;
  to?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", isLoading, className, children, disabled, asLink, to, ...props }, ref) => {
    const classes = clsx(
      "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60",
      variantClasses[variant],
      sizeClasses[size],
      className
    );

    if (asLink && to) {
      return (
        <Link to={to} className={classes}>
          {children}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={classes}
        {...props}
      >
        {isLoading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: Variant;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, variant = "ghost", className, children, ...props }, ref) => (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={clsx(
        "inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-150",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);
IconButton.displayName = "IconButton";
