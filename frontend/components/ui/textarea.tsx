"use client";

import * as React from "react"

import { cn } from "@/lib/utils"

import { AlertCircle } from "lucide-react"

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    const [internalError, setInternalError] = React.useState(error);

    React.useEffect(() => {
      setInternalError(error);
    }, [error]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (internalError) {
        setInternalError(undefined);
      }
      if (props.onChange) {
        props.onChange(e);
      }
    };

  const textareaElement = (
      <textarea
        data-slot="textarea"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className={cn(
          "flex min-h-[100px] w-full rounded-xl border border-input bg-background px-4 py-3 text-[15px] text-foreground transition-all duration-300 outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:shadow-[0_0_15px_rgba(79,70,229,0.25)] disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:shadow-[0_0_15px_rgba(220,38,38,0.25)] md:text-sm dark:disabled:bg-input/80 rtl:text-right ltr:text-left resize-y",
          internalError && "border-destructive focus-visible:border-destructive focus-visible:shadow-[0_0_15px_rgba(220,38,38,0.25)]",
          className
        )}
      dir={props.dir || "auto"}
      aria-invalid={!!internalError}
      ref={ref}
      onChange={handleChange}
      {...props}
    />
  );

  return (
    <div className="relative w-full">
      {textareaElement}
      {internalError && (
        <span className="flex items-center gap-1.5 mt-1.5 start-0.5 text-[12px] text-destructive font-medium leading-tight animate-in fade-in-50 duration-200">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 opacity-90" />
          <span>{internalError}</span>
        </span>
      )}
    </div>
  );
});

Textarea.displayName = "Textarea";

export { Textarea }
