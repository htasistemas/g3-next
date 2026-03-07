import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-9 w-full rounded-md border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 text-sm text-[var(--g3-foreground)] outline-none ring-[var(--g3-active)] transition placeholder:text-[var(--g3-muted)] focus:ring-2",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
