import * as React from "react";
import { cn } from "@/lib/utils";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        "h-9 w-full rounded-md border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 text-sm text-[var(--g3-foreground)] outline-none ring-[var(--g3-active)] transition focus:ring-2",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});

Select.displayName = "Select";
