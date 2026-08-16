"use client";

import * as React from "react"

import { cn } from "@/lib/utils"

import { AlertCircle } from "lucide-react"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ElementType;
  error?: string;
  endAdornment?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon: Icon, error, endAdornment, ...props }, ref) => {
    const [internalError, setInternalError] = React.useState(error);

    React.useEffect(() => {
      setInternalError(error);
    }, [error]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (internalError) {
        setInternalError(undefined);
      }
      if (props.onChange) {
        props.onChange(e);
      }
    };

  return (
    <div className="relative w-full">
      <div className="relative w-full">
        {Icon && (
          <span className="absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none flex items-center justify-center z-10">
            <Icon size={18} />
          </span>
        )}
        <input
          type={type}
          data-slot="input"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className={cn(
            "h-12 w-full min-w-0 rounded-xl border border-input bg-background px-4 py-0 text-[15px] text-foreground transition-all duration-300 outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:shadow-[0_0_15px_rgba(79,70,229,0.25)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:shadow-[0_0_15px_rgba(220,38,38,0.25)] text-start",
            Icon && "ps-11",
            endAdornment && "pe-11",
            internalError && "border-destructive focus-visible:ring-destructive focus-visible:shadow-[0_0_15px_rgba(220,38,38,0.25)]",
            className
          )}
          dir={props.dir}
          aria-invalid={!!internalError}
          ref={ref}
          onChange={handleChange}
          {...props}
        />
        {endAdornment && (
          <span className="absolute end-4 top-1/2 -translate-y-1/2 flex items-center justify-center z-10">
            {endAdornment}
          </span>
        )}
      </div>
      {internalError && (
        <span className="flex items-center gap-1.5 mt-1.5 start-0.5 text-[12px] text-destructive font-medium leading-tight animate-in fade-in-50 duration-200">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 opacity-90" />
          <span>{internalError}</span>
        </span>
      )}
    </div>
  );
});

Input.displayName = "Input";

export { Input }